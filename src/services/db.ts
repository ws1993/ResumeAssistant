import Dexie, { type Table } from 'dexie';
import type { JdAnalysis } from '@/schema/jdAnalysis';
import type {
  JdSnapshot,
  ResumeDocument,
  ResumeVersion,
} from '@/schema/resume';

export interface JdHistoryEntry extends JdSnapshot {
  id: string;
}

export interface AnalysisEntry extends JdAnalysis {
  id: string;
  versionId: string;
  baseResumeId: string;
}

export interface SettingsEntry {
  key: 'llm' | 'webdav' | 'ui';
  value: unknown;
  updatedAt: string;
}

export class ResumeDB extends Dexie {
  resumes!: Table<ResumeDocument, string>;
  versions!: Table<ResumeVersion, string>;
  jdHistory!: Table<JdHistoryEntry, string>;
  analyses!: Table<AnalysisEntry, string>;
  settings!: Table<SettingsEntry, string>;

  constructor() {
    super('resume-assistant');
    this.version(1).stores({
      resumes: 'id, meta.updatedAt',
      versions: 'id, baseResumeId, parentVersionId, createdAt',
      jdHistory: 'id, collectedAt',
      analyses: 'id, versionId, baseResumeId, analyzedAt',
      settings: 'key',
    });
  }
}

export const db = new ResumeDB();

export async function saveResume(doc: ResumeDocument): Promise<void> {
  const updated: ResumeDocument = {
    ...doc,
    meta: { ...doc.meta, updatedAt: new Date().toISOString() },
  };
  await db.resumes.put(updated);
}

export async function deleteResumeCascade(resumeId: string): Promise<void> {
  await db.transaction('rw', db.resumes, db.versions, db.analyses, async () => {
    await db.resumes.delete(resumeId);
    const versionIds = await db.versions.where('baseResumeId').equals(resumeId).primaryKeys();
    if (versionIds.length) await db.versions.bulkDelete(versionIds);
    const analysisIds = await db.analyses
      .where('baseResumeId')
      .equals(resumeId)
      .primaryKeys();
    if (analysisIds.length) await db.analyses.bulkDelete(analysisIds);
  });
}

export async function getSetting<T>(key: SettingsEntry['key']): Promise<T | undefined> {
  const entry = await db.settings.get(key);
  return entry?.value as T | undefined;
}

export async function putSetting<T>(key: SettingsEntry['key'], value: T): Promise<void> {
  await db.settings.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.resumes, db.versions, db.jdHistory, db.analyses, db.settings, async () => {
    await Promise.all([
      db.resumes.clear(),
      db.versions.clear(),
      db.jdHistory.clear(),
      db.analyses.clear(),
      db.settings.clear(),
    ]);
  });
}

export interface ExportPayload {
  schemaVersion: 1;
  exportedAt: string;
  resumes: ResumeDocument[];
  versions: ResumeVersion[];
  jdHistory: JdHistoryEntry[];
  analyses: AnalysisEntry[];
  settings: SettingsEntry[];
}

export async function exportAll(includeSecrets = false): Promise<ExportPayload> {
  const [resumes, versions, jdHistory, analyses, settings] = await Promise.all([
    db.resumes.toArray(),
    db.versions.toArray(),
    db.jdHistory.toArray(),
    db.analyses.toArray(),
    db.settings.toArray(),
  ]);

  const sanitizedSettings: SettingsEntry[] = settings.map((entry) => {
    if (includeSecrets) return entry;
    if (entry.key === 'llm' && entry.value && typeof entry.value === 'object') {
      return {
        ...entry,
        value: { ...(entry.value as Record<string, unknown>), apiKey: '' },
      };
    }
    if (entry.key === 'webdav' && entry.value && typeof entry.value === 'object') {
      return {
        ...entry,
        value: { ...(entry.value as Record<string, unknown>), password: '', passphrase: '' },
      };
    }
    return entry;
  });

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    resumes,
    versions,
    jdHistory,
    analyses,
    settings: sanitizedSettings,
  };
}

export async function importAll(payload: ExportPayload, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
  await db.transaction(
    'rw',
    db.resumes,
    db.versions,
    db.jdHistory,
    db.analyses,
    db.settings,
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.resumes.clear(),
          db.versions.clear(),
          db.jdHistory.clear(),
          db.analyses.clear(),
          db.settings.clear(),
        ]);
      }
      if (payload.resumes?.length) await db.resumes.bulkPut(payload.resumes);
      if (payload.versions?.length) await db.versions.bulkPut(payload.versions);
      if (payload.jdHistory?.length) await db.jdHistory.bulkPut(payload.jdHistory);
      if (payload.analyses?.length) await db.analyses.bulkPut(payload.analyses);
      if (payload.settings?.length) await db.settings.bulkPut(payload.settings);
    },
  );
}
