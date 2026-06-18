import { create } from 'zustand';

import type { JdAnalysis, Suggestion } from '@/schema/jdAnalysis';

export type Phase = 'idle' | 'analyzing' | 'analyzed' | 'suggesting' | 'error';

interface TailorState {
  jd: string;
  company?: string;
  industry?: string;
  analysis?: JdAnalysis;
  rawAnalysis?: string;
  phase: Phase;
  error?: string;
  selectedIds: Set<string>;
  setJd: (s: string) => void;
  setCompany: (s: string) => void;
  setIndustry: (s: string) => void;
  setAnalysis: (a: JdAnalysis | undefined, raw?: string) => void;
  setPhase: (p: Phase, error?: string) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  reset: () => void;
}

export const useTailorStore = create<TailorState>((set) => ({
  jd: '',
  phase: 'idle',
  selectedIds: new Set(),
  setJd: (jd) => set({ jd }),
  setCompany: (company) => set({ company }),
  setIndustry: (industry) => set({ industry }),
  setAnalysis: (analysis, rawAnalysis) =>
    set({ analysis, rawAnalysis, phase: analysis ? 'analyzed' : 'idle', selectedIds: new Set() }),
  setPhase: (phase, error) => set({ phase, error }),
  toggleSelected: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelected: () => set({ selectedIds: new Set() }),
  reset: () =>
    set({
      jd: '',
      company: undefined,
      industry: undefined,
      analysis: undefined,
      rawAnalysis: undefined,
      phase: 'idle',
      error: undefined,
      selectedIds: new Set(),
    }),
}));

export type { Suggestion };
