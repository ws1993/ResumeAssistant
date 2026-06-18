/**
 * WebDAV 同步客户端。
 * - 依赖浏览器原生 fetch（无需依赖 webdav npm 包）
 * - push：导出数据库 → AES-GCM 加密 → PUT 到远端
 * - pull：GET 远端 → AES-GCM 解密 → 返回 ExportPayload
 * - testConnection：PROPFIND 验证凭据
 * - listSnapshots：列出远端快照文件
 * - pullSnapshot：从指定快照恢复
 * - deleteSnapshot：删除指定快照
 */

import type { WebDAVSettings } from '@/schema/settings';
import { exportAll, importAll, type ExportPayload } from '@/services/db';
import { encryptJson, decryptJson } from '@/lib/crypto';

/* ------------------------------------------------------------------ */
/*  基础工具                                                           */
/* ------------------------------------------------------------------ */

function buildHeaders(
  username: string,
  password: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const basic = btoa(`${username}:${password}`);
  return {
    Authorization: `Basic ${basic}`,
    ...extra,
  };
}

function normalizeUrl(endpoint: string, path: string): string {
  const base = endpoint.replace(/\/$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
}

/* ------------------------------------------------------------------ */
/*  底层 HTTP                                                          */
/* ------------------------------------------------------------------ */

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
    headers: buildHeaders(settings.username, settings.password, {
      'Content-Type': 'application/octet-stream',
    }),
    body: content,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT ${path} failed (${res.status}): ${text.slice(0, 200)}`);
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
    throw new Error(`GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.text();
}

async function deleteContent(
  settings: WebDAVSettings,
  path: string,
): Promise<void> {
  const url = normalizeUrl(settings.endpoint, path);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(settings.username, settings.password),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/* ------------------------------------------------------------------ */
/*  连接测试                                                           */
/* ------------------------------------------------------------------ */

export interface ConnectionTestResult {
  ok: boolean;
  status?: number;
  error?: string;
  serverVersion?: string;
}

/**
 * 测试 WebDAV 连接：对 remotePath 发送 PROPFIND，验证凭据和可达性。
 */
export async function testConnection(
  settings: WebDAVSettings,
): Promise<ConnectionTestResult> {
  const remotePath = settings.remotePath || '/resume-assistant';
  const url = normalizeUrl(settings.endpoint, remotePath);
  try {
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: buildHeaders(settings.username, settings.password, {
        Depth: '0',
        'Content-Type': 'application/xml',
      }),
      body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:resourcetype/></D:prop>
</D:propfind>`,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, error: '认证失败，请检查用户名和密码' };
    }
    if (res.status === 404) {
      // 目录不存在，但连接本身是通的——尝试 MKCOL 创建
      await ensureDir(settings, remotePath);
      return { ok: true, status: 200, serverVersion: '目录已自动创建' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof TypeError
        ? '网络错误，请检查地址是否正确'
        : String(err),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  快照列表                                                           */
/* ------------------------------------------------------------------ */

export interface SnapshotEntry {
  name: string;
  path: string;
  lastModified: string;
  size: number;
}

/**
 * 列出远端目录下的所有 .json.enc 快照文件（不含 latest.json.enc）。
 */
export async function listSnapshots(
  settings: WebDAVSettings,
): Promise<SnapshotEntry[]> {
  const remotePath = settings.remotePath || '/resume-assistant';
  const url = normalizeUrl(settings.endpoint, remotePath);

  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: buildHeaders(settings.username, settings.password, {
      Depth: '1',
      'Content-Type': 'application/xml',
    }),
    body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getlastmodified/>
    <D:getcontentlength/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PROPFIND failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const xml = await res.text();
  const entries: SnapshotEntry[] = [];

  // 简单 XML 解析——提取每个 <D:response> 块
  const responseBlocks = xml.split(/<\/D:response>/i);
  for (const block of responseBlocks) {
    const href = extractXmlTag(block, 'D:href');
    if (!href) continue;

    const resType = extractXmlTag(block, 'D:resourcetype');
    if (resType && resType.includes('collection')) continue; // 跳过目录

    const name = decodeURIComponent(href.split('/').filter(Boolean).pop() ?? '');
    if (!name.endsWith('.json.enc') || name === 'latest.json.enc') continue;

    const lastModified = extractXmlTag(block, 'D:getlastmodified') ?? '';
    const sizeStr = extractXmlTag(block, 'D:getcontentlength') ?? '0';

    entries.push({
      name,
      path: `${remotePath}/${name}`,
      lastModified,
      size: Number(sizeStr) || 0,
    });
  }

  // 按时间倒序
  entries.sort((a, b) => b.name.localeCompare(a.name));
  return entries;
}

function extractXmlTag(xml: string, tag: string): string | null {
  // 支持有命名空间前缀的标签
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

/* ------------------------------------------------------------------ */
/*  快照恢复                                                           */
/* ------------------------------------------------------------------ */

/**
 * 从指定快照文件拉取并解密。
 */
export async function pullSnapshot(
  settings: WebDAVSettings,
  snapshotPath: string,
): Promise<PullInfo> {
  if (!settings.passphrase) throw new Error('请先设置加密口令');
  const encrypted = await getContent(settings, snapshotPath);
  if (!encrypted) throw new Error(`快照不存在：${snapshotPath}`);
  const decrypted = await decryptJson<ExportPayload>(encrypted, settings.passphrase);
  if (decrypted.schemaVersion !== 1) {
    throw new Error(`schemaVersion 不匹配：${decrypted.schemaVersion}`);
  }
  return { encrypted, decrypted, path: snapshotPath };
}

/**
 * 从指定快照恢复并导入。
 */
export async function restoreSnapshot(
  settings: WebDAVSettings,
  snapshotPath: string,
  mode: 'replace' | 'merge',
): Promise<SyncResult> {
  const info = await pullSnapshot(settings, snapshotPath);
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

/* ------------------------------------------------------------------ */
/*  快照删除                                                           */
/* ------------------------------------------------------------------ */

/**
 * 删除指定快照文件。
 */
export async function deleteSnapshot(
  settings: WebDAVSettings,
  snapshotPath: string,
): Promise<void> {
  await deleteContent(settings, snapshotPath);
}

/**
 * 清理旧快照，保留最近 maxKeep 个。
 */
export async function pruneSnapshots(
  settings: WebDAVSettings,
  maxKeep: number,
): Promise<number> {
  const snapshots = await listSnapshots(settings);
  if (snapshots.length <= maxKeep) return 0;

  const toDelete = snapshots.slice(maxKeep); // 已按时间倒序，删除尾部
  let deleted = 0;
  for (const snap of toDelete) {
    try {
      await deleteContent(settings, snap.path);
      deleted++;
    } catch {
      // 忽略单个删除失败
    }
  }
  return deleted;
}

/* ------------------------------------------------------------------ */
/*  冲突检测                                                           */
/* ------------------------------------------------------------------ */

export interface ConflictInfo {
  hasConflict: boolean;
  remoteTime?: string;
  localTime?: string;
  remoteCount?: { resumes: number; versions: number };
}

/**
 * 检测远端 latest 是否比本地更新，用于拉取前的冲突提示。
 */
export async function detectConflict(
  settings: WebDAVSettings,
  localUpdatedAt: string,
): Promise<ConflictInfo> {
  const remotePath = settings.remotePath || '/resume-assistant';
  const url = normalizeUrl(settings.endpoint, `${remotePath}/latest.json.enc`);

  const res = await fetch(url, {
    method: 'HEAD',
    headers: buildHeaders(settings.username, settings.password),
  });

  if (res.status === 404) {
    return { hasConflict: false };
  }
  if (!res.ok) {
    return { hasConflict: false };
  }

  const remoteLastModified = res.headers.get('Last-Modified') ?? '';
  const remoteTime = remoteLastModified
    ? new Date(remoteLastModified).toISOString()
    : '';

  const localTime = localUpdatedAt || '';
  const hasConflict = remoteTime > localTime;

  return {
    hasConflict,
    remoteTime,
    localTime,
  };
}

/* ------------------------------------------------------------------ */
/*  推送 / 拉取（原有接口）                                            */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  action: 'push' | 'pull';
  timestamp: string;
  count: { resumes: number; versions: number };
}

/**
 * 推送到 WebDAV：导出数据库 → 加密 → 写入远端
 */
export async function pushToWebDAV(
  settings: WebDAVSettings,
  options?: { pruneOld?: boolean; maxSnapshots?: number },
): Promise<SyncResult> {
  if (!settings.passphrase) throw new Error('请先设置加密口令');
  const remotePath = settings.remotePath || '/resume-assistant';
  await ensureDir(settings, remotePath);

  const payload = await exportAll(false);
  const encrypted = await encryptJson(payload, settings.passphrase);
  const timestamp = new Date().toISOString();
  const ts = timestamp.replace(/[:.]/g, '-');

  await putContent(settings, `${remotePath}/snapshot-${ts}.json.enc`, encrypted);
  await putContent(settings, `${remotePath}/latest.json.enc`, encrypted);

  // 可选：清理旧快照
  if (options?.pruneOld && options.maxSnapshots) {
    await pruneSnapshots(settings, options.maxSnapshots);
  }

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
