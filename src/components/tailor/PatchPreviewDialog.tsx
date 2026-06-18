import type { PatchPreview } from '@/lib/jsonPatch';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PatchPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PatchPreview[];
  onApply: () => void;
  applying?: boolean;
  rationale?: string[];
  error?: string;
}

function renderValue(v: unknown): string {
  if (v === undefined) return '(undefined)';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function PatchPreviewDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  applying,
  rationale,
  error,
}: PatchPreviewDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>改写预览（共 {previews.length} 处变更）</DialogTitle>
          <DialogDescription>
            点击「确认应用」会产出新版本，原稿保留。可随时在版本树回滚。
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {previews.map((p, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-border p-3">
              <header className="flex items-center gap-2 text-xs">
                <Badge variant={p.ok ? 'success' : 'destructive'}>{p.op.op}</Badge>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{(p.op as { path?: string }).path}</code>
                {!p.ok ? <span className="text-destructive">{p.error}</span> : null}
              </header>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Before</div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/60 p-2 leading-snug">
                    {renderValue(p.before)}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">After</div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-[color:var(--success)]/10 p-2 leading-snug">
                    {renderValue(p.after)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rationale?.length ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">查看 LLM 给出的改写理由</summary>
            <ul className="mt-2 space-y-1 pl-4 list-disc">
              {rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applying}>
            取消
          </Button>
          <Button onClick={onApply} disabled={applying || !!error}>
            {applying ? '应用中…' : '确认应用并生成新版本'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
