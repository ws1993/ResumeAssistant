import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ChevronDown,
  Upload,
  Download,
} from 'lucide-react';

import { cn, formatDateTime } from '@/lib/utils';
import { useSyncStore, type SyncLogEntry } from '@/stores/syncStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function isConfigured(s: { endpoint: string; username: string; password: string; passphrase?: string }): boolean {
  return !!(s.endpoint && s.username && s.password && s.passphrase);
}

function LogEntryRow({ entry }: { entry: SyncLogEntry }): React.JSX.Element {
  const iconMap = {
    push: <Upload className="size-3" />,
    pull: <Download className="size-3" />,
    test: <RefreshCw className="size-3" />,
    restore: <RefreshCw className="size-3" />,
    delete: <CloudOff className="size-3" />,
    prune: <CloudOff className="size-3" />,
  };
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className={cn('mt-0.5', entry.status === 'success' ? 'text-[color:var(--success)]' : 'text-[color:var(--destructive)]')}>
        {entry.status === 'success' ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{entry.message}</p>
        <p className="text-[10px] text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
      </div>
      <div className="shrink-0 text-muted-foreground">{iconMap[entry.action]}</div>
    </div>
  );
}

export function SyncStatusIndicator(): React.JSX.Element | null {
  const { t } = useTranslation();
  const { webdav } = useSettingsStore();
  const { status, lastSyncedAt, lastError, log, push, pull, startAutoSync, stopAutoSync } = useSyncStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 不显示：未配置 WebDAV
  if (!isConfigured(webdav)) return null;

  const isSyncing = status === 'pushing' || status === 'pulling' || status === 'testing' || status === 'listing';
  const hasError = status === 'error' || !!lastError;

  // 状态图标
  const StatusIcon = isSyncing
    ? Loader2
    : hasError
      ? AlertCircle
      : Cloud;

  const iconClass = cn(
    'size-4 transition-colors',
    isSyncing && 'animate-spin text-[color:var(--warning)]',
    hasError && 'text-[color:var(--destructive)]',
    !isSyncing && !hasError && 'text-[color:var(--success)]',
  );

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 启动自动同步
  useEffect(() => {
    if (webdav.autoSync && isConfigured(webdav)) {
      startAutoSync();
    }
    return () => stopAutoSync();
  }, [webdav.autoSync, webdav.endpoint, webdav.autoSyncIntervalMin, startAutoSync, stopAutoSync]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 border-2 px-2.5 text-[0.6875rem] font-bold uppercase tracking-wider transition-colors',
          hasError
            ? 'border-[color:var(--destructive)] text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10'
            : 'border-transparent text-muted-foreground hover:border-foreground hover:text-foreground',
        )}
        title={t('sync.status')}
      >
        <StatusIcon className={iconClass} />
        {isSyncing ? (
          <span className="hidden sm:inline">{t('sync.syncing')}</span>
        ) : null}
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
          {/* 头部状态 */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={iconClass} />
              <span className="text-xs font-semibold">
                {isSyncing
                  ? t('sync.syncing')
                  : hasError
                    ? t('sync.error')
                    : t('sync.idle')}
              </span>
            </div>
            {lastSyncedAt && (
              <Badge variant="secondary" className="text-[10px]">
                <Clock className="mr-1 size-2.5" />
                {formatDateTime(lastSyncedAt)}
              </Badge>
            )}
          </div>

          {/* 错误信息 */}
          {lastError && (
            <div className="mb-2 rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/5 p-2 text-[11px] text-[color:var(--destructive)]">
              {lastError}
            </div>
          )}

          {/* 快捷操作 */}
          <div className="mb-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              disabled={isSyncing}
              onClick={() => { void push(webdav); }}
            >
              <Upload className="mr-1 size-3" />
              {t('sync.pushNow')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              disabled={isSyncing}
              onClick={() => {
                if (confirm(t('sync.pullConfirm'))) {
                  void pull(webdav, 'merge');
                }
              }}
            >
              <Download className="mr-1 size-3" />
              {t('sync.pullNow')}
            </Button>
          </div>

          {/* 同步历史 */}
          {log.length > 0 && (
            <>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('sync.history')}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                {log.slice(0, 10).map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </>
          )}

          {log.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">{t('sync.noHistory')}</p>
          )}
        </div>
      )}
    </div>
  );
}
