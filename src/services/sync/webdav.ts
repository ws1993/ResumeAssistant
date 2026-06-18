/**
 * WebDAV 同步客户端。
 * - 依赖浏览器原生 fetch（无需依赖 webdav npm 包）
 * - push：导出数据库 → AES-GCM 加密 → PUT 到远端
 * - pull：GET 远端 → AES-GCM 解密 → 返回 ExportPayload
 */

import type { WebDAVSettings } from '@/schema/settings';
import { exportAll, importAll, type ExportPayload } from '@/services/db';
import { encryptJson, decryptJson } from '@/lib/crypto';

function buildHeaders(username: string, password: string): Record<string, string> {
  const basic = btoa(`${username}:${password}`);
  return {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/octet-stream',
  };
}

function normalizeUrl(endpoint: string, path: string): string {
  const base = endpoint.replace(/\/$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
}

async function ensureDir(
  settings: WebDAVSettings,
  dirPath: string,
): Promise<void> {
  const url = normalizeUrl(settings.endpoint, dirPath);
  await fetch(url, {
    method: 'MKCOL',
    headers: buildHeaders(settings.username, settings.password),
  }).catch(() => {
    /* 已存在则忽略 405 */
  });
}

async function putContent(
  settings: WebDAVSettings,
  path: string,
  content: string,
): Promise<void> {
  const url = normalizeUrl(settings.endpoint, path);
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(settings.username, settings.password),
    body: content,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT ${path} 失败 (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function getContent(
  settings: WebDAVSettings,
  path: string,
): Promise<string | null> {
  const url = normalizeUrl(settings.endpoint, path);
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(settings.username, settings.password),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} 失败 (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.text();
}

export interface SyncResult {
  action: 'push' | 'pull';
  timestamp: string;
  count: { resumes: number; versions: number };
}

/**
 * 推送到 WebDAV：导出数据库 → 加密 → 写入远端
 */
export async function pushToWebDAV(settings: WebDAVSettings): Promise<SyncResult> {
  if (!settings.passphrase) throw new Error('请先设置加密口令');
  const remotePath = settings.remotePath || '/resume-assistant';
  await ensureDir(settings, remotePath);

  const payload = await exportAll(false);
  const encrypted = await encryptJson(payload, settings.passphrase);
  const timestamp = new Date().toISOString();
  const ts = timestamp.replace(/[:.]/g, '-');

  await putContent(settings, `${remotePath}/snapshot-${ts}.json.enc`, encrypted);
  await putContent(settings, `${remotePath}/latest.json.enc`, encrypted);

  return {
    action: 'push',
    timestamp,
    count: { resumes: payload.resumes.length, versions: payload.versions.length },
  };
}

export interface PullInfo {
  encrypted: string;
  decrypted: ExportPayload;
  path: string;
}

/**
 * 从 WebDAV 拉取：读取 latest.json.enc → 解密
 */
export async function pullFromWebDAV(
  settings: WebDAVSettings,
): Promise<PullInfo> {
  if (!settings.passphrase) throw new Error('请先设置加密口令');
  const remotePath = settings.remotePath || '/resume-assistant';
  const path = `${remotePath}/latest.json.enc`;
  const encrypted = await getContent(settings, path);
  if (!encrypted) throw new Error(`远端不存在 ${path}，请先推送`);
  const decrypted = await decryptJson<ExportPayload>(encrypted, settings.passphrase);
  if (decrypted.schemaVersion !== 1) {
    throw new Error(`schemaVersion 不匹配：${decrypted.schemaVersion}`);
  }
  return { encrypted, decrypted, path };
}

/**
 * 完整拉取流程：拉取 → 根据模式导入
 */
export async function pullAndImport(
  settings: WebDAVSettings,
  mode: 'replace' | 'merge',
): Promise<SyncResult> {
  const info = await pullFromWebDAV(settings);
  await importAll(info.decrypted, mode);
  return {
    action: 'pull',
    timestamp: new Date().toISOString(),
    count: {
      resumes: info.decrypted.resumes.length,
      versions: info.decrypted.versions.length,
    },
  };
}
