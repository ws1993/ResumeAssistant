import { applyPatch, deepClone, type Operation } from 'fast-json-patch';

import type { JsonPatchOp } from '@/schema/patches';

export interface PatchPreview {
  op: JsonPatchOp;
  before: unknown;
  after: unknown;
  ok: boolean;
  error?: string;
}

function getByPointer(doc: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') return doc;
  const parts = pointer
    .replace(/^\//, '')
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur: unknown = doc;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) cur = cur[Number(p)];
    else if (typeof cur === 'object') cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  return cur;
}

/** 干跑：每条 op 依次模拟应用，记录 before/after。 */
export function previewPatch<T>(doc: T, ops: JsonPatchOp[]): { previews: PatchPreview[]; result?: T; error?: string } {
  const previews: PatchPreview[] = [];
  let working = deepClone(doc) as T;
  try {
    for (const op of ops) {
      const targetPath = 'path' in op ? op.path : '';
      const before = getByPointer(working, targetPath);
      try {
        const next = applyPatch(working, [op as Operation], false, false).newDocument as T;
        const after = getByPointer(next, targetPath);
        previews.push({ op, before, after, ok: true });
        working = next;
      } catch (err) {
        previews.push({ op, before, after: undefined, ok: false, error: String(err) });
        return { previews, error: String(err) };
      }
    }
    return { previews, result: working };
  } catch (err) {
    return { previews, error: String(err) };
  }
}

/** 真实应用一组 patch，返回新文档（原文档不变）。 */
export function applyPatchSafe<T>(doc: T, ops: JsonPatchOp[]): T {
  return applyPatch(deepClone(doc) as T, ops as unknown as Operation[], false, false).newDocument as T;
}
