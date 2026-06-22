/**
 * 提示词集中管理。
 * 变更记录见 docs/prompts.md。
 */

import type { ResumeDocument } from '@/schema/resume';
import type { Suggestion } from '@/schema/jdAnalysis';

export const PROMPT_VERSION = 'v1';

export interface AnalyzeJdContext {
  jd: string;
  resume: ResumeDocument;
  targetLanguage?: 'zh' | 'en';
  dictionaryKeywords?: string[];
}

export interface SuggestContext {
  resume: ResumeDocument;
  jd: string;
  suggestions: Pick<Suggestion, 'id' | 'target' | 'rationale' | 'draft'>[];
  targetLanguage?: 'zh' | 'en';
}

export interface CoverLetterContext {
  resume: ResumeDocument;
  jd: string;
  targetLanguage?: 'zh' | 'en';
  company?: string;
}

function langTag(lang?: 'zh' | 'en'): string {
  return lang === 'en' ? 'English' : '简体中文';
}

export function analyzeJdMessages(ctx: AnalyzeJdContext): Array<{ role: 'system' | 'user'; content: string }> {
  const lang = langTag(ctx.targetLanguage);
  const dictHint = ctx.dictionaryKeywords?.length
    ? `本地词典在 JD 中匹配到的硬技能（仅供参考，不要遗漏这些）：${ctx.dictionaryKeywords.slice(0, 50).join(' / ')}`
    : '';

  const system = `你是一位资深技术招聘官与 ATS 专家。请用 ${lang} 思考与输出。

你的任务：给定一份 JD 与候选人简历的 JSON，按以下维度各给 0-100 分：

**核心维度（必须）**：
1. keywords（关键词覆盖）：JD 的硬技能、工具链、责任词在简历中的命中率与位置质量
2. relevance（经历相关度）：候选人的工作 / 项目经历与 JD 任职要求的实质相关程度
3. quantified（量化数据）：要点是否包含可验证的数字（人数 / 时长 / 性能提升 / 业务指标）
4. expression（表达专业度）：是否使用强动词、是否避免空话套话、术语是否一致
5. format（结构规范）：区块顺序合理、关键信息易扫读、无冗余

**扩展维度（可选，请尽量提供）**：
6. skillsMatch（技能匹配）：技能列表与JD要求的精确匹配度
7. experienceMatch（经验匹配）：工作年限和经历级别与岗位要求的匹配程度
8. technicalDepth（技术深度）：技术能力描述的深度和专业性
9. industryAlignment（行业契合）：行业背景与目标公司领域的契合度
10. educationMatch（教育匹配）：学历背景是否符合岗位要求
11. quantifiedImpact（量化成果）：业务影响力的量化表达程度
12. toneSeniority（语气资历）：语言风格是否与目标职级（初级/中级/高级）匹配
13. atsCompatibility（ATS兼容）：简历格式对ATS系统的友好度（避免表格、图片、特殊字符）

总分计算方式：核心维度加权平均（权重：关键词 0.30 / 相关度 0.30 / 量化 0.20 / 表达 0.10 / 结构 0.10）

你还需要返回：
- matchedKeywords：JD 与简历共同涉及的关键词及其在简历中的频次
- missingKeywords：JD 中重要但简历未涉及的关键词（最多 12 个）
- suggestions：最多 8 条改进建议，每条都要包含：
    - id（唯一字符串）
    - priority（p0 必改 / p1 建议改 / p2 锦上添花）
    - target（RFC 6901 JSON Pointer，定位到简历对象中具体字段，如 "/experiences/0/bullets/2"；若新增条目用 "/projects/-"）
    - rationale（一句话问题诊断）
    - draft（可直接使用的改写草稿）
    - category（keyword / quantify / rewrite / restructure）
- redFlags：最多 3 条最严重问题，每条一句话
- summary：30 字以内的整体诊断
- skillsEvidence（技能证明链）：提取 JD 中要求的核心技能（最多 10 个），对每个技能分析：
    - skill（技能名称）
    - strength（证明强度 0-5 星）
    - sources（证明来源数组，每个包含 type/path/excerpt/relevance）
        - type: 'experience' | 'project' | 'education' | 'skills'
        - path: JSON Pointer 指向简历中的段落（如 "/experiences/0"）
        - excerpt: 相关文本片段（20字以内）
        - relevance: 相关性 0-1
    - status: 'strong'（3+星）| 'weak'（1-2星）| 'missing'（0星）
    - recommendation: 如果是弱证明或缺失，给出改进建议

严格按下述 JSON Schema 返回，不要任何解释性前后文，不要 Markdown 代码块：
{
  "scores": {
    "overall": 0,
    "keywords": 0,
    "relevance": 0,
    "quantified": 0,
    "expression": 0,
    "format": 0,
    "skillsMatch": 0,
    "experienceMatch": 0,
    "technicalDepth": 0,
    "industryAlignment": 0,
    "educationMatch": 0,
    "quantifiedImpact": 0,
    "toneSeniority": 0,
    "atsCompatibility": 0
  },
  "summary": "",
  "matchedKeywords": [{ "term": "", "frequency": 0, "source": "both", "category": "hard-skill" }],
  "missingKeywords": [],
  "suggestions": [{ "id": "s1", "priority": "p0", "target": "/experiences/0/bullets/2", "rationale": "", "draft": "", "category": "quantify" }],
  "redFlags": [],
  "skillsEvidence": [
    {
      "skill": "React",
      "strength": 4,
      "sources": [
        { "type": "experience", "path": "/experiences/0", "excerpt": "开发React组件库", "relevance": 0.9 }
      ],
      "status": "strong",
      "recommendation": ""
    }
  ]
}`;

  const user = `${dictHint ? `${dictHint}\n\n` : ''}=== JD ===\n${ctx.jd}\n\n=== RESUME_JSON ===\n${JSON.stringify(ctx.resume)}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function suggestMessages(ctx: SuggestContext): Array<{ role: 'system' | 'user'; content: string }> {
  const lang = langTag(ctx.targetLanguage);
  const system = `你是简历改写专家，输出语言：${lang}。

给你一份简历 JSON、对应 JD、若干条已被用户接受的改写建议（含 target / rationale / draft）。
请把这些建议转化为符合 RFC 6902 的 JSON Patch，作用在该简历 JSON 上：

- 仅可修改建议中 target 字段；不允许超出授权的字段
- 数组某项要替换内容时用 replace；新增条目用 add（数组末尾路径为 "/foo/-"）；删除多余的用 remove
- 改写要保留事实，仅在表达 / 顺序 / 量化粒度上优化；禁止编造未提供的数字
- 如果 draft 已是精炼版本，可直接采用；否则结合原文 + draft 给出更高质量的版本

严格返回 JSON：
{
  "operations": [
    { "op": "replace", "path": "/experiences/0/bullets/2", "value": "..." }
  ],
  "rationale": ["对应 sugId=s1：将单纯描述改写为量化句式"]
}`;

  const user = `=== JD ===\n${ctx.jd}\n\n=== RESUME_JSON ===\n${JSON.stringify(ctx.resume)}\n\n=== ACCEPTED_SUGGESTIONS ===\n${JSON.stringify(ctx.suggestions)}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function coverLetterMessages(ctx: CoverLetterContext): Array<{ role: 'system' | 'user'; content: string }> {
  const lang = ctx.targetLanguage === 'en' ? 'English' : '简体中文';
  const system =
    ctx.targetLanguage === 'en'
      ? `You are a professional cover letter writer. Output in ${lang}. Write 280-350 words. Use action verbs at sentence starts and the STAR structure. No emoji. Output Markdown body only (no title).`
      : `你是一位面试官口吻的求职信写手，用 ${lang} 输出。

要求：
- 200-280 字
- 开头 1 句明确目标岗位与公司
- 中段 2 段：先用 1-2 个简历中的高相关经历佐证"我能胜任"，再说明"我为何想加入这家公司"
- 结尾 1 句礼貌请期待回应
- 语言克制专业，避免 emoji / 感叹号 / 套话堆砌
- 直接返回 Markdown 正文，不要标题，不要解释`;

  const user = `${ctx.company ? `目标公司：${ctx.company}\n\n` : ''}=== JD ===\n${ctx.jd}\n\n=== RESUME_JSON ===\n${JSON.stringify(ctx.resume)}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
