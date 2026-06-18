import type { JdSnapshot, ResumeDocument, ResumeVersion } from '@/schema/resume';
import { newId } from '@/schema/resume';
import { db, type AnalysisEntry } from '@/services/db';
import type { JdAnalysis } from '@/schema/jdAnalysis';

export async function createVersion(args: {
  baseResumeId: string;
  parentVersionId?: string;
  source: ResumeVersion['source'];
  document: ResumeDocument;
  jdSnapshot?: JdSnapshot;
  note?: string;
}): Promise<ResumeVersion> {
  const version: ResumeVersion = {
    id: newId(),
    baseResumeId: args.baseResumeId,
    parentVersionId: args.parentVersionId,
    source: args.source,
    document: args.document,
    jdSnapshot: args.jdSnapshot,
    createdAt: new Date().toISOString(),
    note: args.note,
  };
  await db.versions.put(version);
  return version;
}

export async function listVersions(baseResumeId: string): Promise<ResumeVersion[]> {
  return db.versions
    .where('baseResumeId')
    .equals(baseResumeId)
    .reverse()
    .sortBy('createdAt');
}

export async function deleteVersion(id: string): Promise<void> {
  await db.versions.delete(id);
}

export async function saveAnalysis(
  analysis: JdAnalysis,
  meta: { versionId: string; baseResumeId: string },
): Promise<AnalysisEntry> {
  const entry: AnalysisEntry = {
    ...analysis,
    id: newId(),
    versionId: meta.versionId,
    baseResumeId: meta.baseResumeId,
  };
  await db.analyses.put(entry);
  return entry;
}
