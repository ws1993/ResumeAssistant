/**
 * 实时评分 Hook：编辑简历时动态更新匹配分数
 *
 * 策略：
 * - 立即更新快速分数（本地计算，< 100ms）
 * - 延迟触发完整分析（防抖 3 秒，LLM 计算）
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import type { ResumeDocument } from '@/schema/resume';
import type { JdAnalysis } from '@/schema/jdAnalysis';
import type { LlmSettings } from '@/schema/settings';
import { quickScore } from '@/lib/quickScore';
import { analyzeJd } from '@/services/llm/analyzeJd';

export interface UseRealtimeScoreOptions {
  jd: string;
  resume: ResumeDocument | null;
  llmSettings: LlmSettings;
  enabled?: boolean; // 是否启用实时评分
  debounceMs?: number; // 完整分析防抖时间（默认 3000ms）
}

export interface RealtimeScoreState {
  quickScores: Partial<JdAnalysis['scores']> | null; // 实时快速分数
  fullAnalysis: JdAnalysis | null; // 完整分析结果
  isAnalyzing: boolean; // 是否正在进行完整分析
  lastAnalyzedAt: string | null; // 上次完整分析时间
  error: Error | null;
  triggerFullAnalysis: () => void; // 手动触发完整分析
}

export function useRealtimeScore({
  jd,
  resume,
  llmSettings,
  enabled = true,
  debounceMs = 3000,
}: UseRealtimeScoreOptions): RealtimeScoreState {
  const [quickScores, setQuickScores] = useState<Partial<JdAnalysis['scores']> | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<JdAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 完整分析函数
  const performFullAnalysis = useCallback(
    async (signal: AbortSignal) => {
      if (!resume || !jd || !enabled) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const result = await analyzeJd(llmSettings, {
          jd,
          resume,
          targetLanguage: resume.meta.language,
          signal,
        });

        if (!signal.aborted) {
          setFullAnalysis(result.analysis);
          setLastAnalyzedAt(new Date().toISOString());
          // 完整分析完成后，清除快速分数（使用完整结果）
          setQuickScores(null);
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!signal.aborted) {
          setIsAnalyzing(false);
        }
      }
    },
    [resume, jd, llmSettings, enabled],
  );

  // 手动触发完整分析
  const triggerFullAnalysis = useCallback(() => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    performFullAnalysis(controller.signal);
  }, [performFullAnalysis]);

  // 监听简历变化
  useEffect(() => {
    if (!resume || !jd || !enabled) {
      setQuickScores(null);
      return;
    }

    // 立即更新快速分数
    try {
      const scores = quickScore({
        jd,
        resume,
        baseAnalysis: fullAnalysis ? { scores: fullAnalysis.scores } : undefined,
      });
      setQuickScores(scores);
    } catch (err) {
      console.error('Quick score calculation failed:', err);
    }

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      performFullAnalysis(controller.signal);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [resume, jd, enabled, debounceMs, performFullAnalysis]);

  // 初始化时执行一次完整分析
  useEffect(() => {
    if (!resume || !jd || !enabled || fullAnalysis) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    performFullAnalysis(controller.signal);

    return () => {
      controller.abort();
    };
  }, [resume, jd, enabled]); // 注意：这里不依赖 fullAnalysis 和 performFullAnalysis

  return {
    quickScores,
    fullAnalysis,
    isAnalyzing,
    lastAnalyzedAt,
    error,
    triggerFullAnalysis,
  };
}
