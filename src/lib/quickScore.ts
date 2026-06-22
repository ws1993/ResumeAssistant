/**
 * 本地快速评分引擎（纯前端，实时计算）
 *
 * 目标：编辑简历时提供即时反馈，无需等待完整 LLM 分析
 * 限制：仅计算可快速量化的维度，复杂语义分析仍需 LLM
 *
 * 实现策略：
 * - keywords: 关键词命中率（词典匹配）
 * - quantified: 量化数据检测（数字+单位模式）
 * - format: 格式规范检查（结构完整性）
 * - atsCompatibility: ATS 兼容性（简单规则检测）
 * - 其他维度：沿用上次 LLM 分析结果（如果有）
 */

import type { ResumeDocument } from '@/schema/resume';
import type { DetailedScores } from '@/schema/jdAnalysis';
import { flattenResumeText, extractDictionaryTerms, countOccurrences } from './tokenizer';

export interface QuickScoreOptions {
  jd: string;
  resume: ResumeDocument;
  baseAnalysis?: { scores: Partial<DetailedScores> }; // 上次完整分析结果
}

/**
 * 快速评分：仅计算可量化的维度，其他维度沿用 baseAnalysis
 */
export function quickScore(opts: QuickScoreOptions): Partial<DetailedScores> {
  const resumeText = flattenResumeText(opts.resume);
  const jdKeywords = extractDictionaryTerms(opts.jd);

  // 1. 关键词覆盖率
  const keywordsScore = calculateKeywordCoverage(resumeText, jdKeywords.map(k => k.term));

  // 2. 量化数据密度
  const quantifiedScore = calculateQuantifiedScore(opts.resume);

  // 3. 格式规范性
  const formatScore = calculateFormatScore(opts.resume);

  // 4. ATS 兼容性
  const atsScore = calculateAtsCompatibility(opts.resume);

  // 5. 技能匹配（基于关键词）
  const skillsMatchScore = keywordsScore; // 简化：技能匹配 ≈ 关键词覆盖

  // 其他维度沿用上次 LLM 分析
  const base = opts.baseAnalysis?.scores ?? {};

  return {
    keywords: keywordsScore,
    quantified: quantifiedScore,
    format: formatScore,
    atsCompatibility: atsScore,
    skillsMatch: skillsMatchScore,
    quantifiedImpact: quantifiedScore, // 与 quantified 相关
    // 以下维度需要 LLM 语义分析，保留原值
    relevance: base.relevance,
    expression: base.expression,
    experienceMatch: base.experienceMatch,
    technicalDepth: base.technicalDepth,
    industryAlignment: base.industryAlignment,
    educationMatch: base.educationMatch,
    toneSeniority: base.toneSeniority,
    overall: base.overall, // 总分由 LLM 计算
  };
}

/**
 * 关键词覆盖率：JD 中的技能词在简历中的命中比例
 */
function calculateKeywordCoverage(resumeText: string, jdKeywords: string[]): number {
  if (jdKeywords.length === 0) return 50; // 无关键词时默认中等

  let hitCount = 0;
  for (const keyword of jdKeywords) {
    if (countOccurrences(resumeText, keyword) > 0) {
      hitCount++;
    }
  }

  const coverage = hitCount / jdKeywords.length;
  // 映射到 0-100 分：30% 覆盖 → 60分，70% 覆盖 → 90分
  return Math.round(40 + coverage * 60);
}

/**
 * 量化数据密度：工作经历和项目中包含数字的比例
 */
function calculateQuantifiedScore(resume: ResumeDocument): number {
  const bullets: string[] = [];

  // 收集所有要点
  resume.experiences?.forEach(exp => bullets.push(...exp.bullets));
  resume.projects?.forEach(proj => bullets.push(...(proj.highlights ?? [])));

  if (bullets.length === 0) return 30; // 无要点时低分

  // 检测量化模式：数字 + 可选单位（%、倍、人、天、万、K、M 等）
  const quantifiedPattern = /\d+[%倍KMkm万千百]|\d+\s*(人|天|周|月|年|次|个|项|家|条|篇|行|台|套)/;

  let quantifiedCount = 0;
  for (const bullet of bullets) {
    if (quantifiedPattern.test(bullet)) {
      quantifiedCount++;
    }
  }

  const ratio = quantifiedCount / bullets.length;
  // 映射：20% 量化 → 50分，60% 量化 → 90分
  return Math.round(30 + ratio * 70);
}

/**
 * 格式规范性：检查必备区块和内容完整性
 */
function calculateFormatScore(resume: ResumeDocument): number {
  let score = 0;

  // 基础信息完整性（30分）
  if (resume.basics.name) score += 10;
  if (resume.basics.email || resume.basics.phone) score += 10;
  if (resume.basics.headline || resume.basics.summary) score += 10;

  // 核心区块存在性（40分）
  if (resume.experiences && resume.experiences.length > 0) score += 20;
  if (resume.educations && resume.educations.length > 0) score += 10;
  if (resume.skills && resume.skills.length > 0) score += 10;

  // 内容充实度（30分）
  const totalBullets = resume.experiences?.reduce((sum, exp) => sum + exp.bullets.length, 0) ?? 0;
  if (totalBullets >= 5) score += 15;
  else if (totalBullets >= 2) score += 10;
  else if (totalBullets >= 1) score += 5;

  const hasProjects = resume.projects && resume.projects.length > 0;
  if (hasProjects) score += 15;

  return Math.min(100, score);
}

/**
 * ATS 兼容性：检测常见 ATS 不友好因素
 */
function calculateAtsCompatibility(resume: ResumeDocument): number {
  let score = 100;

  // 扣分项：
  // 1. 技能列表为空或过少（-20分）
  const skillCount = resume.skills?.reduce((sum, group) => sum + group.items.length, 0) ?? 0;
  if (skillCount === 0) score -= 20;
  else if (skillCount < 5) score -= 10;

  // 2. 工作经历缺少职位或公司（-15分）
  const missingTitles = resume.experiences?.filter(exp => !exp.title || !exp.company).length ?? 0;
  score -= Math.min(15, missingTitles * 5);

  // 3. 日期格式不规范（简单检测：-10分）
  const hasInvalidDates = resume.experiences?.some(exp => {
    const start = exp.period.start;
    // 检测常见格式：YYYY-MM、YYYY/MM、YYYY.MM 等
    return start && !/^\d{4}[-./]\d{1,2}/.test(start);
  }) ?? false;
  if (hasInvalidDates) score -= 10;

  // 4. 缺少联系方式（-15分）
  if (!resume.basics.email && !resume.basics.phone) score -= 15;

  // 5. 简历过长（经验 > 10 条视为冗余，-10分）
  if ((resume.experiences?.length ?? 0) > 10) score -= 10;

  return Math.max(0, score);
}
