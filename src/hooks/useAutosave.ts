import { useEffect, useRef } from 'react';

import { useResumeStore } from '@/stores/resumeStore';

export function useAutosave(intervalMs = 800): { savedAt?: string; dirty: boolean } {
  const dirty = useResumeStore((s) => s.dirty);
  const current = useResumeStore((s) => s.current);
  const flush = useResumeStore((s) => s.flush);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty || !current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, intervalMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, current, flush, intervalMs]);

  return { savedAt: current?.meta.updatedAt, dirty };
}
