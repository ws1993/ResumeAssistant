import type { z } from 'zod';

import type { LlmSettings } from '@/schema/settings';
import { LlmError, withRetry } from './retry';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequestOptions {
  messages: ChatMessage[];
  responseFormat?: 'text' | 'json_object';
  temperature?: number;
  signal?: AbortSignal;
  /** 流式回调；非 null 时启用 SSE 流式 */
  onDelta?: (delta: string) => void;
}

export interface ChatRawResponse {
  content: string;
  finishReason?: string;
  usage?: { prompt: number; completion: number; total: number };
}

function buildBody(
  settings: LlmSettings,
  opts: ChatRequestOptions,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: settings.model,
    messages: opts.messages,
    temperature: opts.temperature ?? settings.temperature ?? 0.4,
    stream,
  };
  if (opts.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

function normalizeBaseURL(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * 调用一次 OpenAI 兼容的 chat.completions 接口。
 * - 支持流式（通过 `onDelta` 回调）
 * - 支持非流式（直接返回 content）
 * - 内置超时与重试
 */
export async function chat(
  settings: LlmSettings,
  opts: ChatRequestOptions,
): Promise<ChatRawResponse> {
  if (!settings.baseURL || !settings.apiKey || !settings.model) {
    throw new LlmError('请先在「设置」中完整配置大模型', 'config');
  }
  const stream = typeof opts.onDelta === 'function';
  const url = `${normalizeBaseURL(settings.baseURL)}/chat/completions`;

  const run = async (): Promise<ChatRawResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs ?? 60000);
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(buildBody(settings, opts, stream)),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        if (opts.signal?.aborted) throw new LlmError('请求已取消', 'abort');
        throw new LlmError('请求超时', 'timeout');
      }
      throw new LlmError(
        `网络错误：${(err as Error).message ?? '未知'}`,
        'network',
        undefined,
        err,
      );
    }

    if (!response.ok) {
      clearTimeout(timeout);
      const text = await response.text().catch(() => '');
      throw new LlmError(
        `LLM 接口返回 ${response.status}：${text.slice(0, 300)}`,
        'http',
        response.status,
        text,
      );
    }

    if (!stream) {
      const json = (await response.json().catch(() => null)) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      } | null;
      clearTimeout(timeout);
      const content = json?.choices?.[0]?.message?.content ?? '';
      return {
        content,
        finishReason: json?.choices?.[0]?.finish_reason,
        usage: json?.usage
          ? {
              prompt: json.usage.prompt_tokens ?? 0,
              completion: json.usage.completion_tokens ?? 0,
              total: json.usage.total_tokens ?? 0,
            }
          : undefined,
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeout);
      throw new LlmError('当前环境不支持流式响应', 'network');
    }
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let finishReason: string | undefined;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string;
              }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              content += delta;
              opts.onDelta?.(delta);
            }
            if (parsed.choices?.[0]?.finish_reason) {
              finishReason = parsed.choices[0].finish_reason;
            }
          } catch {
            /* 忽略坏行 */
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return { content, finishReason };
  };

  return withRetry(run, { maxRetries: settings.maxRetries ?? 1 });
}

/**
 * 调用 LLM 并要求 JSON 输出 + Zod 校验。
 * 校验失败会自动再 retry 一次（兜底）。
 */
export async function chatJSON<T>(
  settings: LlmSettings,
  opts: Omit<ChatRequestOptions, 'responseFormat'> & { schema: z.ZodType<T> },
): Promise<{ data: T; raw: string }> {
  const { schema, ...rest } = opts;
  let lastRaw = '';
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const resp = await chat(settings, { ...rest, responseFormat: 'json_object' });
    lastRaw = resp.content;
    const jsonText = extractJsonObject(resp.content);
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const validated = schema.parse(parsed);
      return { data: validated, raw: resp.content };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new LlmError(
    '大模型返回的 JSON 不符合预期，已重试一次仍失败',
    'validation',
    undefined,
    { raw: lastRaw, cause: lastErr },
  );
}

/** 从响应文本中提取 JSON：去掉 ```json fence、找首个 `{` 到末个 `}` */
function extractJsonObject(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

export async function ping(settings: LlmSettings, signal?: AbortSignal): Promise<{
  ok: true;
  content: string;
  usage?: ChatRawResponse['usage'];
}> {
  const resp = await chat(settings, {
    messages: [
      { role: 'system', content: '你是一个助手，只回复 "pong"。' },
      { role: 'user', content: 'ping' },
    ],
    temperature: 0,
    signal,
  });
  return { ok: true, content: resp.content, usage: resp.usage };
}
