# 数据模型

> 所有模型用 Zod 在 [`src/schema/`](../src/schema/) 中定义，作为整个应用的真理源。Dexie 表结构 + LLM 输出 + 表单 schema 均由此派生。

## 1. 命名约定

- ID 字段统一用 `crypto.randomUUID()`（浏览器原生，无需依赖）
- 时间字段用 ISO 8601 字符串 `string`（如 `2026-06-18T03:45:00.000Z`）
- 可选字段后缀 `?`；不存在的语义用 `undefined`，不用 `null`
- 集合（多条目）一律用数组，避免 `Record` 易丢失顺序

## 2. 核心模型

### 2.1 `ResumeDocument`

简历正文。**这一对象会被多次完整拷贝到不同的 `ResumeVersion` 中**，所以保持值类型、可序列化。

```ts
interface Basics {
  name: string;
  headline?: string;        // 一句话头衔，如 "全栈工程师"
  email?: string;
  phone?: string;
  location?: string;
  links: Link[];            // 个人网站、GitHub、LinkedIn 等
  summary?: string;         // 个人简介（Markdown 子集，仅支持加粗 / 列表）
}

interface Link {
  id: string;
  label: string;            // 显示文本
  url: string;
  category?: 'personal' | 'github' | 'linkedin' | 'portfolio' | 'other';
}

interface Period {
  start: string;            // YYYY-MM
  end?: string;             // YYYY-MM 或 undefined（表示「至今」）
}

interface WorkExperience {
  id: string;
  company: string;
  title: string;             // 职位
  period: Period;
  location?: string;
  bullets: string[];         // 工作内容要点
  stack?: string[];          // 涉及技术栈
}

interface Project {
  id: string;
  name: string;
  role?: string;             // 在项目中的角色
  period?: Period;
  summary?: string;          // 一段式概述
  highlights: string[];      // 量化要点 / 亮点
  stack?: string[];
  links: Link[];
}

interface Education {
  id: string;
  school: string;
  degree?: string;
  major?: string;
  period: Period;
  gpa?: string;
  highlights?: string[];     // 主修课程 / 荣誉
}

interface SkillGroup {
  id: string;
  category: string;          // 如 "编程语言" / "框架" / "工具链"
  items: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;             // YYYY-MM
  url?: string;
}

interface Publication {
  id: string;
  title: string;
  venue?: string;            // 会议 / 期刊
  date?: string;
  authors?: string[];
  url?: string;
}

interface CustomSection {
  id: string;
  title: string;
  bullets: string[];
}

type SectionKey =
  | 'basics'
  | 'experiences'
  | 'projects'
  | 'educations'
  | 'skills'
  | 'certifications'
  | 'publications'
  | 'custom';

interface ResumeMeta {
  title: string;             // 简历名（用户可改），如 "前端 - 字节"
  targetRole?: string;       // 目标岗位
  language: 'zh' | 'en';     // 输出语言
  template: string;          // 模板 id，如 'paper-a'
  sectionOrder: SectionKey[];// 区块显示顺序
  createdAt: string;
  updatedAt: string;
}

interface ResumeDocument {
  id: string;                // 主简历 id（version 共享同一 baseResumeId）
  meta: ResumeMeta;
  basics: Basics;
  experiences: WorkExperience[];
  projects: Project[];
  educations: Education[];
  skills: SkillGroup[];
  certifications?: Certification[];
  publications?: Publication[];
  customSections?: CustomSection[];
}
```

### 2.2 `ResumeVersion`

每次「按 JD 改写」生成一个新版本，挂在 `baseResumeId` 下形成树。

```ts
interface ResumeVersion {
  id: string;
  baseResumeId: string;            // 指向主简历
  parentVersionId?: string;        // 形成版本树
  source: 'manual' | 'jd-tailor' | 'import';
  jdSnapshot?: JdSnapshot;         // 仅当 source==='jd-tailor' 时
  document: ResumeDocument;        // 完整副本（值类型）
  createdAt: string;
  note?: string;
}

interface JdSnapshot {
  jdText: string;
  targetRole?: string;
  company?: string;
  industry?: string;
  collectedAt: string;
}
```

### 2.3 `JdAnalysis`

LLM 输出 schema。返回时必须严格通过 Zod 校验，否则触发一次重试。

```ts
type ScoreDim = 'overall' | 'keywords' | 'relevance' | 'quantified' | 'expression' | 'format';

interface JdAnalysis {
  scores: Record<ScoreDim, number>; // 0-100
  summary: string;                  // 一句话总结
  matchedKeywords: KeywordHit[];
  missingKeywords: string[];        // 简历中没出现但 JD 里有的关键词
  suggestions: Suggestion[];
  redFlags: string[];               // 严重问题，如简历无量化数据 / 无目标岗位匹配经验
  analyzedAt: string;
}

interface KeywordHit {
  term: string;
  frequency: number;     // 在简历中出现次数
  source: 'jd' | 'resume' | 'both';
  category?: 'hard-skill' | 'soft-skill' | 'responsibility' | 'tool';
}

interface Suggestion {
  id: string;
  priority: 'p0' | 'p1' | 'p2';     // p0 = 必改
  target: string;                    // JSON Pointer，如 "/experiences/0/bullets/2"
  rationale: string;                 // 为什么要改
  draft: string;                     // 改写草稿
  category?: 'keyword' | 'quantify' | 'rewrite' | 'restructure';
}
```

### 2.4 JSON Patch

走 RFC 6902 标准，由 `fast-json-patch` 执行。

```ts
type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

interface RewriteResult {
  operations: JsonPatchOp[];
  rationale: string[];     // 每个 op 对应一条 rationale
}
```

### 2.5 `LlmSettings` & `WebDAVSettings`

```ts
interface LlmSettings {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature?: number;        // 默认 0.4
  timeoutMs?: number;          // 默认 60000
  maxRetries?: number;         // 默认 1
  presetId?: 'openai' | 'deepseek' | 'qwen' | 'moonshot' | 'openrouter' | 'ollama' | 'custom';
}

interface WebDAVSettings {
  endpoint: string;
  username: string;
  password: string;
  remotePath: string;          // 如 /resume-assistant
  passphrase?: string;         // 用于 AES-GCM 派生密钥
  lastSyncedAt?: string;
}
```

## 3. Dexie 表结构

```ts
class ResumeDB extends Dexie {
  resumes!: Table<ResumeDocument, string>;        // 主简历
  versions!: Table<ResumeVersion, string>;         // 简历版本
  jdHistory!: Table<JdSnapshot & { id: string }, string>;  // JD 历史
  analyses!: Table<JdAnalysis & { id: string; versionId: string }, string>;
  settings!: Table<{ key: 'llm' | 'webdav' | 'ui'; value: unknown }, string>;

  constructor() {
    super('resume-assistant');
    this.version(1).stores({
      resumes: 'id, meta.updatedAt',
      versions: 'id, baseResumeId, parentVersionId, createdAt',
      jdHistory: 'id, collectedAt',
      analyses: 'id, versionId, analyzedAt',
      settings: 'key',
    });
  }
}
```

## 4. 序列化与导出

- `ExportPayload` = `{ schemaVersion: 1, exportedAt, resumes, versions, settings (脱敏后) }`
- `Settings` 中的 `apiKey` / `password` 在导出时默认置空，避免无意识泄露；用户可勾选「包含密钥」
- WebDAV 同步走完整 `ExportPayload` 再 AES-GCM 加密

## 5. 迁移策略

- 每次 schema 升级在 [`services/db.ts`](../src/services/db.ts) 增加新的 `this.version(N).stores(...).upgrade(...)`，用户首次打开旧库会自动迁移
- 重大破坏性变更：先 dump JSON → 升级 → 重新导入，保证可回退
