import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  Wand2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LLM_PRESETS, type LlmPresetId, type LlmSettings, type WebDAVSettings } from '@/schema/settings';
import { useSettingsStore } from '@/stores/settingsStore';
import { ping } from '@/services/llm/client';
import { LlmError } from '@/services/llm/retry';
import { clearAll, exportAll, importAll, type ExportPayload } from '@/services/db';
import { pushToWebDAV, pullAndImport } from '@/services/sync/webdav';
import { toast } from '@/stores/toastStore';
import { cn, formatDateTime } from '@/lib/utils';

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { llm, loaded, load, setLlm, webdav, setWebDAV } = useSettingsStore();
  const [draft, setDraft] = useState<LlmSettings>(llm);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);
  const [wdraft, setWdraft] = useState<WebDAVSettings>(webdav);
  const [wdavBusy, setWdavBusy] = useState<'push' | 'pull' | null>(null);
  const [wdavDirty, setWdavDirty] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    setDraft(llm);
  }, [llm]);

  useEffect(() => {
    setWdraft(webdav);
    setWdavDirty(false);
  }, [webdav]);

  const setWd = (mut: (d: WebDAVSettings) => void): void => {
    setWdraft((d) => {
      const next = { ...d };
      mut(next);
      return next;
    });
    setWdavDirty(true);
  };

  const applyPreset = (id: LlmPresetId): void => {
    const preset = LLM_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setDraft((d) => ({
      ...d,
      presetId: preset.id,
      baseURL: preset.baseURL || d.baseURL,
      model: preset.defaultModel || d.model,
    }));
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(llm);

  const onSave = async (): Promise<void> => {
    await setLlm(draft);
    toast({ title: '设置已保存', variant: 'success' });
  };

  const onTest = async (): Promise<void> => {
    setTesting(true);
    try {
      const resp = await ping(draft);
      toast({
        title: '连接成功',
        description: `模型回复：${resp.content?.slice(0, 40) || '（空）'}${
          resp.usage ? ` · ${resp.usage.total} tokens` : ''
        }`,
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof LlmError ? err.message : String(err);
      toast({ title: '连接失败', description: msg, variant: 'error', durationMs: 8000 });
    } finally {
      setTesting(false);
    }
  };

  const onExport = async (): Promise<void> => {
    setBusy('export');
    try {
      const payload = await exportAll(false);
      downloadJSON(
        `resume-assistant-export-${new Date().toISOString().slice(0, 10)}.json`,
        payload,
      );
      toast({ title: '已导出', variant: 'success' });
    } finally {
      setBusy(null);
    }
  };

  const onImport = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy('import');
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as ExportPayload;
        if (!payload || payload.schemaVersion !== 1) {
          throw new Error('schemaVersion 不匹配，无法识别该导出文件');
        }
        const mode = confirm('确定覆盖现有数据？\n点「确定」=覆盖；点「取消」=合并') ? 'replace' : 'merge';
        await importAll(payload, mode);
        toast({ title: '导入完成', description: `模式：${mode === 'replace' ? '覆盖' : '合并'}`, variant: 'success' });
      } catch (err) {
        toast({ title: '导入失败', description: String(err), variant: 'error' });
      } finally {
        setBusy(null);
      }
    };
    input.click();
  };

  const onClear = async (): Promise<void> => {
    if (!confirm('确认清空本地所有数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有简历、版本、设置都会被删除。')) return;
    setBusy('clear');
    try {
      await clearAll();
      toast({ title: '本地数据已清空', variant: 'warning' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-muted-foreground" /> {t('settings.llm.title')}
          </CardTitle>
          <CardDescription className="flex items-start gap-2 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-2 text-[color:var(--warning)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{t('settings.llm.warning')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('settings.llm.presets')}</Label>
            <div className="flex flex-wrap gap-2">
              {LLM_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs transition',
                    draft.presetId === p.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {LLM_PRESETS.find((p) => p.id === draft.presetId)?.note ? (
              <p className="text-xs text-muted-foreground">
                {LLM_PRESETS.find((p) => p.id === draft.presetId)?.note}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="baseURL">{t('settings.llm.baseURL')}</Label>
              <Input
                id="baseURL"
                placeholder="https://api.openai.com/v1"
                value={draft.baseURL}
                onChange={(e) => setDraft({ ...draft, baseURL: e.target.value, presetId: 'custom' })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">{t('settings.llm.model')}</Label>
              <Input
                id="model"
                placeholder="gpt-4o-mini / deepseek-chat …"
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiKey">{t('settings.llm.apiKey')}</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-…"
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                className="pr-9"
              />
              <button
                type="button"
                aria-label="切换显示"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="temp">{t('settings.llm.temperature')}</Label>
              <Input
                id="temp"
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={draft.temperature ?? 0.4}
                onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeout">{t('settings.llm.timeout')}</Label>
              <Input
                id="timeout"
                type="number"
                step="5"
                min={10}
                value={Math.round((draft.timeoutMs ?? 60000) / 1000)}
                onChange={(e) =>
                  setDraft({ ...draft, timeoutMs: Math.max(10, Number(e.target.value)) * 1000 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retry">重试次数</Label>
              <Input
                id="retry"
                type="number"
                step="1"
                min={0}
                max={5}
                value={draft.maxRetries ?? 1}
                onChange={(e) =>
                  setDraft({ ...draft, maxRetries: Math.max(0, Math.min(5, Number(e.target.value))) })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSave} disabled={!dirty}>
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={onTest} disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('settings.llm.test')}
            </Button>
            {dirty ? <span className="text-xs text-muted-foreground">未保存</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="size-4 text-muted-foreground" /> {t('settings.webdav.title')}
          </CardTitle>
          <CardDescription>
            数据加密后推送到你的 WebDAV 服务器（坚果云 / NextCloud / 自建）。
            所有凭据仅保存在浏览器。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wdav-endpoint">{t('settings.webdav.endpoint')}</Label>
              <Input
                id="wdav-endpoint"
                placeholder="https://dav.jianguoyun.com/dav/"
                value={wdraft.endpoint}
                onChange={(e) => setWd((d) => (d.endpoint = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wdav-path">{t('settings.webdav.remotePath')}</Label>
              <Input
                id="wdav-path"
                placeholder="/resume-assistant"
                value={wdraft.remotePath}
                onChange={(e) => setWd((d) => (d.remotePath = e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wdav-user">{t('settings.webdav.username')}</Label>
              <Input
                id="wdav-user"
                value={wdraft.username}
                onChange={(e) => setWd((d) => (d.username = e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wdav-pass">{t('settings.webdav.password')}</Label>
              <Input
                id="wdav-pass"
                type="password"
                value={wdraft.password}
                onChange={(e) => setWd((d) => (d.password = e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wdav-phrase">{t('settings.webdav.passphrase')}</Label>
            <Input
              id="wdav-phrase"
              type="password"
              placeholder="用于加密数据库快照的口令（可选但建议填写）"
              value={wdraft.passphrase ?? ''}
              onChange={(e) => setWd((d) => (d.passphrase = e.target.value || undefined))}
            />
            <p className="text-[11px] text-muted-foreground">
              口令用于 PBKDF2 + AES-GCM 加密导出内容，拉取时需输入同一口令。
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setWdavBusy('push');
                try {
                  await setWebDAV(wdraft);
                  const res = await pushToWebDAV(wdraft);
                  toast({
                    title: '推送成功',
                    description: `${res.count.resumes} 份简历 · ${res.count.versions} 个版本`,
                    variant: 'success',
                  });
                } catch (err) {
                  toast({ title: '推送失败', description: String(err), variant: 'error', durationMs: 8000 });
                } finally {
                  setWdavBusy(null);
                }
              }}
              disabled={wdavBusy !== null || !wdraft.endpoint || !wdraft.username || !wdraft.password}
            >
              {wdavBusy === 'push' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudUpload className="size-4" />
              )}
              {t('settings.webdav.push')}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setWdavBusy('pull');
                try {
                  await setWebDAV(wdraft);
                  if (!confirm('拉取后会覆盖或合并本地数据，是否继续？')) { setWdavBusy(null); return; }
                  const mode = confirm('覆盖本地数据？\n「确定」= 覆盖；「取消」= 合并')
                    ? 'replace'
                    : 'merge';
                  const res = await pullAndImport(wdraft, mode);
                  toast({
                    title: '拉取成功',
                    description: `已${mode === 'replace' ? '覆盖' : '合并'} · ${res.count.resumes} 份简历`,
                    variant: 'success',
                  });
                } catch (err) {
                  toast({ title: '拉取失败', description: String(err), variant: 'error', durationMs: 8000 });
                } finally {
                  setWdavBusy(null);
                }
              }}
              disabled={wdavBusy !== null || !wdraft.endpoint || !wdraft.username || !wdraft.password}
            >
              {wdavBusy === 'pull' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudDownload className="size-4" />
              )}
              {t('settings.webdav.pull')}
            </Button>
            {wdavDirty ? (
              <Button
                size="sm"
                onClick={async () => { await setWebDAV(wdraft); toast({ title: 'WebDAV 设置已保存', variant: 'success' }); }}
              >
                保存设置
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.data.title')}</CardTitle>
          <CardDescription>
            数据 100% 存在本地浏览器，可随时导出 / 导入 / 清空。
            {llm ? <> · 最近更新：{formatDateTime(new Date())}</> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} disabled={busy !== null}>
            <Download className="size-4" /> {t('settings.data.export')}
          </Button>
          <Button variant="outline" onClick={onImport} disabled={busy !== null}>
            <Upload className="size-4" /> {t('settings.data.import')}
          </Button>
          <Button
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={onClear}
            disabled={busy !== null}
          >
            {t('settings.data.clear')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
