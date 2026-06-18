import type { Suggestion } from '@/schema/jdAnalysis';
import { rewriteResultSchema, type RewriteResult } from '@/schema/patches';
import type { ResumeDocument } from '@/schema/resume';
import type { LlmSettings } from '@/schema/settings';

import { chatJSON } from './client';
import { suggestMessages } from './prompts';

export interface SuggestOptions {
  resume: ResumeDocument;
  jd: string;
  suggestions: Suggestion[];
  targetLanguage?: 'zh' | 'en';
  signal?: AbortSignal;
}

export async function generatePatch(
  settings: LlmSettings,
  opts: SuggestOptions,
): Promise<{ result: RewriteResult; raw: string }> {
  const messages = suggestMessages({
    resume: opts.resume,
    jd: opts.jd,
    suggestions: opts.suggestions.map((s) => ({
      id: s.id,
      target: s.target,
      rationale: s.rationale,
      draft: s.draft,
    })),
    targetLanguage: opts.targetLanguage ?? opts.resume.meta.language,
  });

  const { data, raw } = await chatJSON(settings, {
    messages,
    schema: rewriteResultSchema,
    signal: opts.signal,
    temperature: 0.3,
  });

  return { result: data, raw };
}
