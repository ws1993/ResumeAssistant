import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { createEmptyResume, type ResumeDocument } from '@/schema/resume';
import { db, saveResume } from '@/services/db';

interface ResumeState {
  current?: ResumeDocument;
  dirty: boolean;
  loading: boolean;
  load: (resumeId: string) => Promise<void>;
  createDraft: () => ResumeDocument;
  set: (mutator: (doc: ResumeDocument) => void) => void;
  setDocument: (doc: ResumeDocument) => void;
  flush: () => Promise<void>;
  reset: () => void;
}

export const useResumeStore = create<ResumeState>()(
  immer((set, get) => ({
    current: undefined,
    dirty: false,
    loading: false,

    load: async (resumeId) => {
      set((s) => {
        s.loading = true;
      });
      const doc = await db.resumes.get(resumeId);
      set((s) => {
        s.current = doc;
        s.dirty = false;
        s.loading = false;
      });
    },

    createDraft: () => {
      const doc = createEmptyResume();
      set((s) => {
        s.current = doc;
        s.dirty = true;
      });
      return doc;
    },

    set: (mutator) => {
      set((s) => {
        if (!s.current) return;
        mutator(s.current);
        s.current.meta.updatedAt = new Date().toISOString();
        s.dirty = true;
      });
    },

    setDocument: (doc) => {
      set((s) => {
        s.current = doc;
        s.dirty = true;
      });
    },

    flush: async () => {
      const doc = get().current;
      if (!doc) return;
      await saveResume(doc);
      set((s) => {
        s.dirty = false;
      });
    },

    reset: () =>
      set((s) => {
        s.current = undefined;
        s.dirty = false;
      }),
  })),
);
