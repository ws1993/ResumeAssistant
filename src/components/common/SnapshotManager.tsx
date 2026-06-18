import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History,
  RefreshCw,
  RotateCcw,
  Trash2,
  Loader2,
  Database,
  HardDrive,
} from 'lucide-react';

import { cn, formatDateTime } from '@/lib/utils';
import { useSyncStore } from '@/stores/syncStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { SnapshotEntry } from '@/services/sync/webdav';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SnapshotRow({
  snapshot,
  onRestore,
  onDelete,
  disabled,
}: {
  snapshot: SnapshotEntry;
  onRestore: (mode: 'replace' | 'merge') => void;
  onDelete: () => void;
  disabled: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState<'restore' | 'delete' | null>(null);

  // 从文件名提取时间：snapshot-2026-01-15T10-30-00-000Z.json.enc
  const tsMatch = snapshot.name.match(/snapshot-(.+)\.json\.enc$/);
  const displayTime = tsMatch
    ? tsMatch[1].replace(/-/g, (m, offset) => {
        // 还原 ISO 时间中的分隔符
        if (offset === 4 || offset === 7) return '-';
        if (offset === 10) return 'T';
        if (offset === 13 || offset === 16) return ':';
        return m;
      })
    : snapshot.name;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 p-2.5 transition hover:bg-accent/50">
      <Database className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{displayTime}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <HardDrive className="size-2.5" />
            {formatSize(snapshot.size)}
          </span>
          {snapshot.lastModified && (
            <span>{formatDateTime(snapshot.lastModified)}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {confirming === 'restore' ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => onRestore('replace')}
            >
              {t('sync.snapshot.overwrite')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => onRestore('merge')}
            >
              {t('sync.snapshot.merge')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => setConfirming(null)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        ) : confirming === 'delete' ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-[color:var(--destructive)]"
              disabled={disabled}
              onClick={() => { onDelete(); setConfirming(null); }}
            >
              {t('common.confirm')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => setConfirming(null)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => setConfirming('restore')}
              title={t('sync.snapshot.restore')}
            >
              <RotateCcw className="size-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-[color:var(--destructive)]"
              disabled={disabled}
              onClick={() => setConfirming('delete')}
              title={t('sync.snapshot.delete')}
            >
              <Trash2 className="size-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function SnapshotManager(): React.JSX.Element {
  const { t } = useTranslation();
  const { webdav } = useSettingsStore();
  const { status, snapshots, loadSnapshots, restore, remove, prune } = useSyncStore();
  const [open, setOpen] = useState(false);

  const isLoading = status === 'listing' || status === 'pulling';
  const isConfigured = !!(webdav.endpoint && webdav.username && webdav.password && webdav.passphrase);

  useEffect(() => {
    if (open && isConfigured) {
      void loadSnapshots(webdav);
    }
  }, [open, isConfigured, loadSnapshots, webdav]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!isConfigured}>
          <History className="mr-1.5 size-3.5" />
          {t('sync.snapshot.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            {t('sync.snapshot.title')}
          </DialogTitle>
          <DialogDescription>
            {t('sync.snapshot.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* 工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {t('sync.snapshot.count', { count: snapshots.length })}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={isLoading}
                onClick={() => void loadSnapshots(webdav)}
              >
                <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
              </Button>
              {snapshots.length > (webdav.maxSnapshots ?? 20) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-[color:var(--warning)]"
                  disabled={isLoading}
                  onClick={() => void prune(webdav, webdav.maxSnapshots ?? 20)}
                >
                  <Trash2 className="mr-1 size-3" />
                  {t('sync.snapshot.prune')}
                </Button>
              )}
            </div>
          </div>

          {/* 快照列表 */}
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
            {isLoading && snapshots.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-xs">{t('common.loading')}</span>
              </div>
            )}

            {!isLoading && snapshots.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <Database className="size-8 opacity-30" />
                <span className="text-xs">{t('sync.snapshot.empty')}</span>
              </div>
            )}

            {snapshots.map((snap) => (
              <SnapshotRow
                key={snap.path}
                snapshot={snap}
                disabled={isLoading}
                onRestore={(mode) => void restore(webdav, snap.path, mode)}
                onDelete={() => void remove(webdav, snap.path)}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <p className="w-full text-left text-[10px] text-muted-foreground">
            {t('sync.snapshot.maxHint', { max: webdav.maxSnapshots ?? 20 })}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
