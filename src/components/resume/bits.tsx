import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

export function BulletEditor({
  value,
  onChange,
  placeholder = '一条要点（建议用动词开头，包含量化数据）',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      {value.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <Textarea
            rows={2}
            value={b}
            placeholder={placeholder}
            onChange={(e) => {
              const next = value.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="删除要点"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...value, ''])}>
        <Plus className="size-4" /> 添加要点
      </Button>
    </div>
  );
}

export function TagEditor({
  value,
  onChange,
  placeholder = '回车添加',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}): React.JSX.Element {
  const [draft, setDraft] = useState('');

  const add = (): void => {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...value, t]);
    setDraft('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="group inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
        >
          {t}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`移除 ${t}`}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <Input
        value={draft}
        placeholder={placeholder}
        className="h-7 w-40 text-xs"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
