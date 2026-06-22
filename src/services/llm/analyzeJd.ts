import type { JdAnalysis, SkillEvidence, SkillSource } from '@/schema/jdAnalysis';
import { jdAnalysisSchema } from '@/schema/jdAnalysis';
import type { ResumeDocument } from '@/schema/resume';
import type { LlmSettings } from '@/schema/settings';

import { chatJSON } from './client';
import { analyzeJdMessages } from './prompts';
import { countOccurrences, extractDictionaryTerms, flattenResumeText } from '@/lib/tokenizer';

/** 按 RFC 6901 解析 JSON Pointer；路径不存在时返回 undefined。 */
function resolveJsonPointer(root: unknown, pointer: string): unknown {
  if (pointer === '') return root;
  if (!pointer.startsWith('/')) return undefined;
  const tokens = pointer
    .slice(1)
    .split('/')
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = root;
  for (const token of tokens) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(token);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else if (typeof current === 'object') {
      if (!Object.prototype.hasOwnProperty.call(current, token)) return undefined;
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  return current;
}

export interface AnalyzeJdOptions {
  jd: string;
  resume: ResumeDocument;
  targetLanguage?: 'zh' | 'en';
  signal?: AbortSignal;
}

export async function analyzeJd(
  settings: LlmSettings,
  opts: AnalyzeJdOptions,
): Promise<{ analysis: JdAnalysis; raw: string }> {
  const dictionary = extractDictionaryTerms(opts.jd);
  const messages = analyzeJdMessages({
    jd: opts.jd,
    resume: opts.resume,
    targetLanguage: opts.targetLanguage ?? opts.resume.meta.language,
    dictionaryKeywords: dictionary.map((d) => d.term),
  });

  const { data, raw } = await chatJSON(settings, {
    messages,
    schema: jdAnalysisSchema,
    signal: opts.signal,
    temperature: 0.2,
  });

  return { analysis: postProcess(data, opts.jd, opts.resume, dictionary.map((d) => d.term)), raw };
}

/**
 * 校验并修正 LLM 返回的技能证明链：
 * - 丢弃 path 无法在简历中解析的 source（应对 Risk 3：JSON Pointer 失效）
 * - 根据存活 source 重新计算 strength / status，保持一致性
 */
function reconcileSkillsEvidence(
  evidence: SkillEvidence[],
  resume: ResumeDocument,
): SkillEvidence[] {
  return evidence.map((item) => {
    const validSources: SkillSource[] = item.sources.filter(
      (s) => resolveJsonPointer(resume, s.path) !== undefined,
    );

    // 依据存活 source 数量与相关性重算强度（0-5 星）
    let strength: number;
    if (validSources.length === 0) {
      strength = 0;
    } else {
      const maxRelevance = Math.max(...validSources.map((s) => s.relevance));
      const countBonus = Math.min(validSources.length - 1, 2) * 0.5;
      strength = Math.max(1, Math.min(5, Math.round(maxRelevance * 4 + countBonus)));
    }

    const status: SkillEvidence['status'] =
      strength === 0 ? 'missing' : strength >= 3 ? 'strong' : 'weak';

    return {
      ...item,
      sources: validSources,
      strength,
      status,
    };
  });
}

/**
 * 本地兜底：
 * - 用词典匹配结果补齐 matchedKeywords / missingKeywords，避免 LLM 漏抽
 * - 重新统计每个 matched term 在简历中的真实频次
 * - 扩展评分维度兜底（向后兼容）：如果 LLM 未返回扩展维度，使用核心维度推算
 * - 校验并修正技能证明链（丢弃失效 JSON Pointer）
 */
function postProcess(
  analysis: JdAnalysis,
  jdText: string,
  resume: ResumeDocument,
  dictionaryHits: string[],
): JdAnalysis {
  const resumeText = flattenResumeText(resume);
  const llmMatchedTerms = new Set(analysis.matchedKeywords.map((k) => k.term.toLowerCase()));
  const llmMissingTerms = new Set(analysis.missingKeywords.map((k) => k.toLowerCase()));

  const matched = analysis.matchedKeywords.map((k) => ({
    ...k,
    frequency: countOccurrences(resumeText, k.term),
  }));

  const extraMissing: string[] = [];
  for (const term of dictionaryHits) {
    const lower = term.toLowerCase();
    const freqInResume = countOccurrences(resumeText, term);
    const freqInJd = countOccurrences(jdText, term);
    if (!freqInJd) continue;
    if (freqInResume === 0) {
      if (!llmMatchedTerms.has(lower) && !llmMissingTerms.has(lower)) {
        extraMissing.push(term);
      }
    } else if (!llmMatchedTerms.has(lower)) {
      matched.push({
        term,
        frequency: freqInResume,
        source: 'both',
        category: 'hard-skill',
      });
    }
  }

  // 扩展评分维度兜底：如果 LLM 未返回新维度，用核心维度降级推算
  const scores = {
    ...analysis.scores,
    skillsMatch: analysis.scores.skillsMatch ?? analysis.scores.keywords,
    experienceMatch: analysis.scores.experienceMatch ?? analysis.scores.relevance,
    technicalDepth: analysis.scores.technicalDepth ?? Math.round((analysis.scores.keywords + analysis.scores.relevance) / 2),
    industryAlignment: analysis.scores.industryAlignment ?? analysis.scores.relevance,
    educationMatch: analysis.scores.educationMatch ?? Math.round(analysis.scores.overall * 0.7),
    quantifiedImpact: analysis.scores.quantifiedImpact ?? analysis.scores.quantified,
    toneSeniority: analysis.scores.toneSeniority ?? analysis.scores.expression,
    atsCompatibility: analysis.scores.atsCompatibility ?? analysis.scores.format,
  };

  // 校验技能证明链
  const skillsEvidence = reconcileSkillsEvidence(analysis.skillsEvidence ?? [], resume);

  return {
    ...analysis,
    scores,
    matchedKeywords: matched,
    missingKeywords: Array.from(new Set([...analysis.missingKeywords, ...extraMissing])).slice(0, 20),
    skillsEvidence,
    analyzedAt: new Date().toISOString(),
  };
}
