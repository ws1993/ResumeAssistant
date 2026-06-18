import { create } from 'zustand';

import {
  defaultLlmSettings,
  defaultWebDAVSettings,
  type LlmSettings,
  type WebDAVSettings,
} from '@/schema/settings';
import { getSetting, putSetting } from '@/services/db';

interface SettingsState {
  llm: LlmSettings;
  webdav: WebDAVSettings;
  loaded: boolean;
  load: () => Promise<void>;
  setLlm: (next: LlmSettings) => Promise<void>;
  setWebDAV: (next: WebDAVSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  llm: defaultLlmSettings(),
  webdav: defaultWebDAVSettings(),
  loaded: false,

  load: async () => {
    const [llm, webdav] = await Promise.all([
      getSetting<LlmSettings>('llm'),
      getSetting<WebDAVSettings>('webdav'),
    ]);
    set({
      llm: { ...defaultLlmSettings(), ...(llm ?? {}) },
      webdav: { ...defaultWebDAVSettings(), ...(webdav ?? {}) },
      loaded: true,
    });
  },

  setLlm: async (next) => {
    set({ llm: next });
    await putSetting('llm', next);
  },

  setWebDAV: async (next) => {
    set({ webdav: next });
    await putSetting('webdav', next);
  },
}));
