import { z } from 'zod';

export const scoreDimSchema = z.enum([
  'overall',
  'keywords',
  'relevance',
  'quantified',
  'expression',
  'format',
]);

// 扩展的详细维度
export const detailedScoreDimSchema = z.enum([
  'overall',
  'keywords',
  'relevance',
  'quantified',
  'expression',
  'format',
  // 新增维度
  'skillsMatch',
  'experienceMatch',
  'technicalDepth',
  'industryAlignment',
  'educationMatch',
  'quantifiedImpact',
  'toneSeniority',
  'atsCompatibility',
]);

export const scoresSchema = z.object({
  overall: z.number().min(0).max(100),
  keywords: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  quantified: z.number().min(0).max(100),
  expression: z.number().min(0).max(100),
  format: z.number().min(0).max(100),
});

// 扩展的详细评分（向后兼容）
export const detailedScoresSchema = scoresSchema.extend({
  skillsMatch: z.number().min(0).max(100).optional(),
  experienceMatch: z.number().min(0).max(100).optional(),
  technicalDepth: z.number().min(0).max(100).optional(),
  industryAlignment: z.number().min(0).max(100).optional(),
  educationMatch: z.number().min(0).max(100).optional(),
  quantifiedImpact: z.number().min(0).max(100).optional(),
  toneSeniority: z.number().min(0).max(100).optional(),
  atsCompatibility: z.number().min(0).max(100).optional(),
});

export const keywordCategorySchema = z.enum([
  'hard-skill',
  'soft-skill',
  'responsibility',
  'tool',
]);

export const keywordHitSchema = z.object({
  term: z.string(),
  frequency: z.number().int().min(0).default(0),
  source: z.enum(['jd', 'resume', 'both']),
  category: keywordCategorySchema.optional(),
});

export const suggestionPrioritySchema = z.enum(['p0', 'p1', 'p2']);
export const suggestionCategorySchema = z.enum([
  'keyword',
  'quantify',
  'rewrite',
  'restructure',
]);

export const suggestionSchema = z.object({
  id: z.string(),
  priority: suggestionPrioritySchema,
  target: z.string().min(1),
  rationale: z.string().min(1),
  draft: z.string().min(1),
  category: suggestionCategorySchema.optional(),
});

// 技能证明来源
export const skillSourceSchema = z.object({
  type: z.enum(['experience', 'project', 'education', 'skills']),
  path: z.string(), // JSON Pointer (如 "/experiences/0")
  excerpt: z.string(), // 相关文本片段
  relevance: z.number().min(0).max(1), // 相关性分数
});

// 技能证明链
export const skillEvidenceSchema = z.object({
  skill: z.string(),
  strength: z.number().int().min(0).max(5), // 证明强度（星级）
  sources: z.array(skillSourceSchema).default([]),
  status: z.enum(['strong', 'weak', 'missing']),
  recommendation: z.string().optional(), // 改进建议
});

export const jdAnalysisSchema = z.object({
  scores: detailedScoresSchema, // 使用扩展的评分Schema
  summary: z.string(),
  matchedKeywords: z.array(keywordHitSchema).default([]),
  missingKeywords: z.array(z.string()).default([]),
  suggestions: z.array(suggestionSchema).default([]),
  redFlags: z.array(z.string()).default([]),
  skillsEvidence: z.array(skillEvidenceSchema).default([]), // 新增技能证明链
  analyzedAt: z.string().optional(),
});

export type ScoreDim = z.infer<typeof scoreDimSchema>;
export type DetailedScoreDim = z.infer<typeof detailedScoreDimSchema>;
export type Scores = z.infer<typeof scoresSchema>;
export type DetailedScores = z.infer<typeof detailedScoresSchema>;
export type KeywordCategory = z.infer<typeof keywordCategorySchema>;
export type KeywordHit = z.infer<typeof keywordHitSchema>;
export type SuggestionPriority = z.infer<typeof suggestionPrioritySchema>;
export type SuggestionCategory = z.infer<typeof suggestionCategorySchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SkillSource = z.infer<typeof skillSourceSchema>;
export type SkillEvidence = z.infer<typeof skillEvidenceSchema>;
export type JdAnalysis = z.infer<typeof jdAnalysisSchema>;

export const SCORE_DIM_LABELS: Record<ScoreDim, { zh: string; en: string }> = {
  overall: { zh: '综合', en: 'Overall' },
  keywords: { zh: '关键词', en: 'Keywords' },
  relevance: { zh: '相关度', en: 'Relevance' },
  quantified: { zh: '量化', en: 'Quantified' },
  expression: { zh: '表达', en: 'Expression' },
  format: { zh: '结构', en: 'Format' },
};

// 扩展的详细维度标签
export const DETAILED_SCORE_DIM_LABELS: Record<DetailedScoreDim, { zh: string; en: string; description: { zh: string; en: string } }> = {
  overall: {
    zh: '综合',
    en: 'Overall',
    description: { zh: '综合匹配度评分', en: 'Overall match score' }
  },
  keywords: {
    zh: '关键词',
    en: 'Keywords',
    description: { zh: 'JD关键词覆盖程度', en: 'JD keyword coverage' }
  },
  relevance: {
    zh: '相关度',
    en: 'Relevance',
    description: { zh: '工作经验与岗位相关性', en: 'Experience relevance to position' }
  },
  quantified: {
    zh: '量化',
    en: 'Quantified',
    description: { zh: '成果数据化程度', en: 'Achievement quantification level' }
  },
  expression: {
    zh: '表达',
    en: 'Expression',
    description: { zh: '语言表达专业性', en: 'Professional language quality' }
  },
  format: {
    zh: '结构',
    en: 'Format',
    description: { zh: '简历格式规范性', en: 'Resume format compliance' }
  },
  skillsMatch: {
    zh: '技能匹配',
    en: 'Skills Match',
    description: { zh: '技能要求匹配程度', en: 'Skills requirement alignment' }
  },
  experienceMatch: {
    zh: '经验匹配',
    en: 'Experience Match',
    description: { zh: '工作年限和经历匹配度', en: 'Work experience alignment' }
  },
  technicalDepth: {
    zh: '技术深度',
    en: 'Technical Depth',
    description: { zh: '技术能力深度展现', en: 'Technical capability depth' }
  },
  industryAlignment: {
    zh: '行业契合',
    en: 'Industry Alignment',
    description: { zh: '行业背景匹配程度', en: 'Industry background match' }
  },
  educationMatch: {
    zh: '教育匹配',
    en: 'Education Match',
    description: { zh: '学历背景符合度', en: 'Educational background fit' }
  },
  quantifiedImpact: {
    zh: '量化成果',
    en: 'Quantified Impact',
    description: { zh: '业务影响力量化表达', en: 'Business impact quantification' }
  },
  toneSeniority: {
    zh: '语气资历',
    en: 'Tone & Seniority',
    description: { zh: '语言风格与目标职级匹配', en: 'Language tone matches seniority level' }
  },
  atsCompatibility: {
    zh: 'ATS兼容',
    en: 'ATS Compatibility',
    description: { zh: 'ATS系统友好度', en: 'ATS system friendliness' }
  },
};
