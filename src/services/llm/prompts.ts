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

你的任务：给定一份 JD 与候选人简历的 JSON，按以下五维各给 0-100 分，再用加权平均得出总分（权重：关键词 0.30 / 相关度 0.30 / 量化 0.20 / 表达 0.10 / 结构 0.10）：

1. keywords（关键词覆盖）：JD 的硬技能、工具链、责任词在简历中的命中率与位置质量
2. relevance（经历相关度）：候选人的工作 / 项目经历与 JD 任职要求的实质相关程度
3. quantified（量化数据）：要点是否包含可验证的数字（人数 / 时长 / 性能提升 / 业务指标）
4. expression（表达专业度）：是否使用强动词、是否避免空话套话、术语是否一致
5. format（结构规范）：区块顺序合理、关键信息易扫读、无冗余

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

严格按下述 JSON Schema 返回，不要任何解释性前后文，不要 Markdown 代码块：
{
  "scores": { "overall": 0, "keywords": 0, "relevance": 0, "quantified": 0, "expression": 0, "format": 0 },
  "summary": "",
  "matchedKeywords": [{ "term": "", "frequency": 0, "source": "both", "category": "hard-skill" }],
  "missingKeywords": [],
  "suggestions": [{ "id": "s1", "priority": "p0", "target": "/experiences/0/bullets/2", "rationale": "", "draft": "", "category": "quantify" }],
  "redFlags": []
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
