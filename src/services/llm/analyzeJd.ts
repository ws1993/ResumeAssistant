import type { JdAnalysis } from '@/schema/jdAnalysis';
import { jdAnalysisSchema } from '@/schema/jdAnalysis';
import type { ResumeDocument } from '@/schema/resume';
import type { LlmSettings } from '@/schema/settings';

import { chatJSON } from './client';
import { analyzeJdMessages } from './prompts';
import { countOccurrences, extractDictionaryTerms, flattenResumeText } from '@/lib/tokenizer';

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
 * 本地兜底：
 * - 用词典匹配结果补齐 matchedKeywords / missingKeywords，避免 LLM 漏抽
 * - 重新统计每个 matched term 在简历中的真实频次
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

  return {
    ...analysis,
    matchedKeywords: matched,
    missingKeywords: Array.from(new Set([...analysis.missingKeywords, ...extraMissing])).slice(0, 20),
    analyzedAt: new Date().toISOString(),
  };
}
