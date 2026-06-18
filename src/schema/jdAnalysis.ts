import { z } from 'zod';

export const scoreDimSchema = z.enum([
  'overall',
  'keywords',
  'relevance',
  'quantified',
  'expression',
  'format',
]);

export const scoresSchema = z.object({
  overall: z.number().min(0).max(100),
  keywords: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  quantified: z.number().min(0).max(100),
  expression: z.number().min(0).max(100),
  format: z.number().min(0).max(100),
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

export const jdAnalysisSchema = z.object({
  scores: scoresSchema,
  summary: z.string(),
  matchedKeywords: z.array(keywordHitSchema).default([]),
  missingKeywords: z.array(z.string()).default([]),
  suggestions: z.array(suggestionSchema).default([]),
  redFlags: z.array(z.string()).default([]),
  analyzedAt: z.string().optional(),
});

export type ScoreDim = z.infer<typeof scoreDimSchema>;
export type Scores = z.infer<typeof scoresSchema>;
export type KeywordCategory = z.infer<typeof keywordCategorySchema>;
export type KeywordHit = z.infer<typeof keywordHitSchema>;
export type SuggestionPriority = z.infer<typeof suggestionPrioritySchema>;
export type SuggestionCategory = z.infer<typeof suggestionCategorySchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type JdAnalysis = z.infer<typeof jdAnalysisSchema>;

export const SCORE_DIM_LABELS: Record<ScoreDim, { zh: string; en: string }> = {
  overall: { zh: '综合', en: 'Overall' },
  keywords: { zh: '关键词', en: 'Keywords' },
  relevance: { zh: '相关度', en: 'Relevance' },
  quantified: { zh: '量化', en: 'Quantified' },
  expression: { zh: '表达', en: 'Expression' },
  format: { zh: '结构', en: 'Format' },
};
