import type { ResumeDocument } from '@/schema/resume';
import type { LlmSettings } from '@/schema/settings';

import { chat, type ChatRawResponse } from './client';
import { coverLetterMessages } from './prompts';

export interface CoverLetterOptions {
  resume: ResumeDocument;
  jd: string;
  company?: string;
  targetLanguage?: 'zh' | 'en';
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

export async function generateCoverLetter(
  settings: LlmSettings,
  opts: CoverLetterOptions,
): Promise<ChatRawResponse> {
  const messages = coverLetterMessages({
    resume: opts.resume,
    jd: opts.jd,
    company: opts.company,
    targetLanguage: opts.targetLanguage ?? opts.resume.meta.language,
  });
  return chat(settings, {
    messages,
    temperature: 0.6,
    signal: opts.signal,
    onDelta: opts.onDelta,
  });
}
