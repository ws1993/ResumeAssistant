export class LlmError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'config'
      | 'network'
      | 'timeout'
      | 'http'
      | 'parse'
      | 'validation'
      | 'abort'
      | 'unknown',
    public readonly status?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export function isRetryable(err: unknown): boolean {
  if (!(err instanceof LlmError)) return false;
  if (err.code === 'network' || err.code === 'timeout') return true;
  if (err.code === 'http' && typeof err.status === 'number') {
    return err.status === 408 || err.status === 425 || err.status === 429 || err.status >= 500;
  }
  return false;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { maxRetries, baseDelayMs = 800, maxDelayMs = 5000 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !isRetryable(err)) break;
      const wait = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
