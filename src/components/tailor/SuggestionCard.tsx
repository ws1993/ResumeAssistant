import type { Suggestion } from '@/schema/jdAnalysis';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRIORITY_STYLE: Record<Suggestion['priority'], { label: string; variant: BadgeVariant }> = {
  p0: { label: '必改', variant: 'destructive' },
  p1: { label: '建议', variant: 'warning' },
  p2: { label: '锦上添花', variant: 'secondary' },
};

const CATEGORY_LABEL: Record<NonNullable<Suggestion['category']>, string> = {
  keyword: '关键词',
  quantify: '量化',
  rewrite: '改写',
  restructure: '结构',
};

export function SuggestionCard({
  suggestion,
  selected,
  onToggle,
}: {
  suggestion: Suggestion;
  selected: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const p = PRIORITY_STYLE[suggestion.priority];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition',
        selected
          ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.04]'
          : 'border-border hover:bg-accent/40',
      )}
    >
      <header className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge variant={p.variant}>{p.label}</Badge>
          {suggestion.category ? (
            <Badge variant="outline">{CATEGORY_LABEL[suggestion.category]}</Badge>
          ) : null}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {suggestion.target}
          </code>
        </div>
        <span className="text-[10px] text-muted-foreground">{selected ? '已选' : '点击选中'}</span>
      </header>
      <p className="text-sm font-medium text-foreground/90">{suggestion.rationale}</p>
      <div className="rounded-md bg-muted/60 p-2 text-xs leading-snug text-foreground/85">
        <span className="mr-2 text-[10px] text-muted-foreground">改写草稿</span>
        {suggestion.draft}
      </div>
    </button>
  );
}
