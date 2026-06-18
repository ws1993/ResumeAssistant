import { TEMPLATES } from '@/components/templates';
import { useResumeStore } from '@/stores/resumeStore';
import { cn } from '@/lib/utils';

export function TemplateSelect(): React.JSX.Element {
  const current = useResumeStore((s) => s.current);
  const setStore = useResumeStore((s) => s.set);
  if (!current) return <></>;
  const activeId = current.meta.template;

  return (
    <div className="no-print flex flex-wrap gap-1.5">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setStore((doc) => (doc.meta.template = t.id))}
          title={t.description}
          className={cn(
            'rounded-md border px-2.5 py-1 text-[11px] transition',
            activeId === t.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
