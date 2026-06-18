import { create } from 'zustand';

import type { WebDAVSettings } from '@/schema/settings';
import type { SnapshotEntry } from '@/services/sync/webdav';
import {
  pushToWebDAV,
  pullAndImport,
  testConnection,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  pruneSnapshots,
} from '@/services/sync/webdav';
import { useSettingsStore } from './settingsStore';
import { toast } from './toastStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'testing' | 'listing' | 'error';

export interface SyncLogEntry {
  id: string;
  action: 'push' | 'pull' | 'test' | 'restore' | 'delete' | 'prune';
  status: 'success' | 'error';
  timestamp: string;
  message: string;
  count?: { resumes: number; versions: number };
}

export interface SyncState {
  /** 当前同步状态 */
  status: SyncStatus;
  /** 最近一次同步时间 */
  lastSyncedAt: string | null;
  /** 最近一次错误 */
  lastError: string | null;
  /** 同步历史（最多保留 50 条） */
  log: SyncLogEntry[];
  /** 远端快照列表缓存 */
  snapshots: SnapshotEntry[];
  /** 自动同步定时器 ID */
  _autoTimer: ReturnType<typeof setInterval> | null;

  /* --- Actions --- */

  /** 推送到远端 */
  push: (settings: WebDAVSettings) => Promise<void>;
  /** 从远端拉取 */
  pull: (settings: WebDAVSettings, mode?: 'replace' | 'merge') => Promise<void>;
  /** 测试连接 */
  test: (settings: WebDAVSettings) => Promise<boolean>;
  /** 加载快照列表 */
  loadSnapshots: (settings: WebDAVSettings) => Promise<void>;
  /** 从指定快照恢复 */
  restore: (settings: WebDAVSettings, snapshotPath: string, mode: 'replace' | 'merge') => Promise<void>;
  /** 删除指定快照 */
  remove: (settings: WebDAVSettings, snapshotPath: string) => Promise<void>;
  /** 清理旧快照 */
  prune: (settings: WebDAVSettings, maxKeep: number) => Promise<void>;

  /** 启动自动同步 */
  startAutoSync: () => void;
  /** 停止自动同步 */
  stopAutoSync: () => void;

  /** 清除错误 */
  clearError: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _idCounter = 0;
function nextId(): string {
  return `sync-${Date.now()}-${++_idCounter}`;
}

function getSettings(): WebDAVSettings {
  return useSettingsStore.getState().webdav;
}

function isConfigured(s: WebDAVSettings): boolean {
  return !!(s.endpoint && s.username && s.password && s.passphrase);
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  lastError: null,
  log: [],
  snapshots: [],
  _autoTimer: null,

  /* ---- push ---- */
  push: async (settings) => {
    if (get().status !== 'idle' && get().status !== 'error') return;
    set({ status: 'pushing', lastError: null });
    try {
      const res = await pushToWebDAV(settings, {
        pruneOld: true,
        maxSnapshots: settings.maxSnapshots ?? 20,
      });
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'push',
        status: 'success',
        timestamp: res.timestamp,
        message: `推送成功 · ${res.count.resumes} 份简历`,
        count: res.count,
      };
      set((s) => ({
        status: 'idle',
        lastSyncedAt: res.timestamp,
        log: [entry, ...s.log].slice(0, 50),
      }));
      // 更新 settingsStore 中的 lastSyncedAt
      await useSettingsStore.getState().setWebDAV({
        ...settings,
        lastSyncedAt: res.timestamp,
      });
      toast({ title: '同步成功', description: `已推送 ${res.count.resumes} 份简历`, variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'push',
        status: 'error',
        timestamp: new Date().toISOString(),
        message: msg,
      };
      set((s) => ({
        status: 'error',
        lastError: msg,
        log: [entry, ...s.log].slice(0, 50),
      }));
    }
  },

  /* ---- pull ---- */
  pull: async (settings, mode = 'merge') => {
    if (get().status !== 'idle' && get().status !== 'error') return;
    set({ status: 'pulling', lastError: null });
    try {
      const res = await pullAndImport(settings, mode);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'pull',
        status: 'success',
        timestamp: res.timestamp,
        message: `拉取成功 · ${res.count.resumes} 份简历 · ${mode === 'replace' ? '覆盖' : '合并'}`,
        count: res.count,
      };
      set((s) => ({
        status: 'idle',
        lastSyncedAt: res.timestamp,
        log: [entry, ...s.log].slice(0, 50),
      }));
      toast({ title: '拉取成功', description: `已${mode === 'replace' ? '覆盖' : '合并'} ${res.count.resumes} 份简历`, variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'pull',
        status: 'error',
        timestamp: new Date().toISOString(),
        message: msg,
      };
      set((s) => ({
        status: 'error',
        lastError: msg,
        log: [entry, ...s.log].slice(0, 50),
      }));
    }
  },

  /* ---- test ---- */
  test: async (settings) => {
    set({ status: 'testing', lastError: null });
    try {
      const res = await testConnection(settings);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'test',
        status: res.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        message: res.ok
          ? `连接成功${res.serverVersion ? ` · ${res.serverVersion}` : ''}`
          : `连接失败 · ${res.error ?? `HTTP ${res.status}`}`,
      };
      set((s) => ({
        status: 'idle',
        lastError: res.ok ? null : (res.error ?? null),
        log: [entry, ...s.log].slice(0, 50),
      }));
      return res.ok;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ status: 'error', lastError: msg });
      return false;
    }
  },

  /* ---- loadSnapshots ---- */
  loadSnapshots: async (settings) => {
    set({ status: 'listing' });
    try {
      const snapshots = await listSnapshots(settings);
      set({ status: 'idle', snapshots });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ status: 'error', lastError: msg, snapshots: [] });
    }
  },

  /* ---- restore ---- */
  restore: async (settings, snapshotPath, mode) => {
    if (get().status !== 'idle' && get().status !== 'error') return;
    set({ status: 'pulling', lastError: null });
    try {
      const res = await restoreSnapshot(settings, snapshotPath, mode);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'restore',
        status: 'success',
        timestamp: res.timestamp,
        message: `从快照恢复成功 · ${res.count.resumes} 份简历`,
        count: res.count,
      };
      set((s) => ({
        status: 'idle',
        lastSyncedAt: res.timestamp,
        log: [entry, ...s.log].slice(0, 50),
      }));
      toast({ title: '恢复成功', description: `已从快照恢复 ${res.count.resumes} 份简历`, variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'restore',
        status: 'error',
        timestamp: new Date().toISOString(),
        message: msg,
      };
      set((s) => ({
        status: 'error',
        lastError: msg,
        log: [entry, ...s.log].slice(0, 50),
      }));
    }
  },

  /* ---- remove ---- */
  remove: async (settings, snapshotPath) => {
    try {
      await deleteSnapshot(settings, snapshotPath);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'delete',
        status: 'success',
        timestamp: new Date().toISOString(),
        message: `已删除快照 ${snapshotPath.split('/').pop()}`,
      };
      set((s) => ({
        snapshots: s.snapshots.filter((snap) => snap.path !== snapshotPath),
        log: [entry, ...s.log].slice(0, 50),
      }));
      toast({ title: '快照已删除', variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ lastError: msg });
      toast({ title: '删除失败', description: msg, variant: 'error' });
    }
  },

  /* ---- prune ---- */
  prune: async (settings, maxKeep) => {
    try {
      const deleted = await pruneSnapshots(settings, maxKeep);
      const entry: SyncLogEntry = {
        id: nextId(),
        action: 'prune',
        status: 'success',
        timestamp: new Date().toISOString(),
        message: `已清理 ${deleted} 个旧快照`,
      };
      set((s) => ({ log: [entry, ...s.log].slice(0, 50) }));
      if (deleted > 0) {
        toast({ title: '清理完成', description: `已删除 ${deleted} 个旧快照`, variant: 'success' });
        // 重新加载列表
        await get().loadSnapshots(settings);
      } else {
        toast({ title: '无需清理', description: '快照数量未超限', variant: 'success' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ lastError: msg });
      toast({ title: '清理失败', description: msg, variant: 'error' });
    }
  },

  /* ---- auto sync ---- */
  startAutoSync: () => {
    const state = get();
    if (state._autoTimer) clearInterval(state._autoTimer);

    const settings = getSettings();
    if (!settings.autoSync || !isConfigured(settings)) return;

    const intervalMs = (settings.autoSyncIntervalMin ?? 30) * 60 * 1000;
    const timer = setInterval(() => {
      const s = getSettings();
      if (!isConfigured(s) || !s.autoSync) {
        get().stopAutoSync();
        return;
      }
      // 只在 idle 状态下自动推送
      if (get().status === 'idle') {
        void get().push(s);
      }
    }, intervalMs);

    set({ _autoTimer: timer });
  },

  stopAutoSync: () => {
    const state = get();
    if (state._autoTimer) {
      clearInterval(state._autoTimer);
      set({ _autoTimer: null });
    }
  },

  clearError: () => set({ lastError: null }),
}));
