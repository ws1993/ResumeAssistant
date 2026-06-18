import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToastStore, type ToastVariant } from '@/stores/toastStore';

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  default: 'border-foreground bg-card text-card-foreground',
  success: 'border-[color:var(--success)] bg-card text-card-foreground',
  error: 'border-[color:var(--destructive)] bg-card text-card-foreground',
  warning: 'border-[color:var(--warning)] bg-card text-card-foreground',
};

const ICON_COLOR: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-[color:var(--success)]',
  error: 'text-[color:var(--destructive)]',
  warning: 'text-[color:var(--warning)]',
};

export function Toaster(): React.JSX.Element {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2 no-print">
      {items.map((it) => {
        const Icon = ICONS[it.variant];
        return (
          <div
            key={it.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 border-2 p-3 shadow-[4px_4px_0_var(--border)] transition-all',
              VARIANT_CLASS[it.variant],
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_COLOR[it.variant])} />
            <div className="flex-1 text-sm">
              {it.title ? <div className="font-bold">{it.title}</div> : null}
              {it.description ? (
                <div className="mt-0.5 text-xs text-muted-foreground break-words">{it.description}</div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="关闭"
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => dismiss(it.id)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
