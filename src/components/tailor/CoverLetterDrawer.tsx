import { useEffect, useRef, useState } from 'react';
import { Copy, Loader2, Wand2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown';
import { generateCoverLetter } from '@/services/llm/coverLetter';
import { LlmError } from '@/services/llm/retry';
import type { ResumeDocument } from '@/schema/resume';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

interface CoverLetterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: ResumeDocument;
  jd: string;
  company?: string;
}

export function CoverLetterDrawer({
  open,
  onOpenChange,
  resume,
  jd,
  company,
}: CoverLetterDrawerProps): React.JSX.Element | null {
  const llm = useSettingsStore((s) => s.llm);
  const [language, setLanguage] = useState<'zh' | 'en'>(resume.meta.language ?? 'zh');
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  if (typeof document === 'undefined') return null;

  const llmReady = Boolean(llm.baseURL && llm.apiKey && llm.model);

  const onGenerate = async (): Promise<void> => {
    if (!llmReady) {
      toast({ title: '请先在设置中配置大模型', variant: 'warning' });
      return;
    }
    if (!jd.trim()) {
      toast({ title: '请先在左侧粘贴 JD', variant: 'warning' });
      return;
    }
    setContent('');
    setGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await generateCoverLetter(llm, {
        resume,
        jd,
        company,
        targetLanguage: language,
        signal: controller.signal,
        onDelta: (delta) => setContent((c) => c + delta),
      });
    } catch (err) {
      if (err instanceof LlmError && err.code === 'abort') {
        toast({ title: '已取消', variant: 'default' });
      } else {
        const msg = err instanceof LlmError ? err.message : String(err);
        toast({ title: '生成失败', description: msg, variant: 'error', durationMs: 8000 });
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  };

  const onCopy = async (): Promise<void> => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: '已复制', variant: 'success' });
    } catch {
      toast({ title: '复制失败，请手动选择', variant: 'error' });
    }
  };

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity no-print',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="absolute inset-0 bg-foreground/40" onClick={() => onOpenChange(false)} />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-card text-card-foreground shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">求职信</h2>
            <div className="ml-3 flex rounded-md border border-border p-0.5 text-[11px]">
              {(['zh', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={cn(
                    'rounded px-2 py-0.5 transition',
                    language === l ? 'bg-foreground text-background' : 'text-muted-foreground',
                  )}
                  onClick={() => setLanguage(l)}
                >
                  {l === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-border px-5 py-2">
          <Button size="sm" onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {generating ? '生成中…' : content ? '重新生成' : '开始生成'}
          </Button>
          {generating ? (
            <Button size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
              取消
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-muted-foreground">
            {company ? `目标公司：${company}` : '未指定公司'}
          </span>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {content ? (
            <SimpleMarkdown source={content} />
          ) : (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              点击「开始生成」基于简历与 JD 写一封 200-280 字（中文）求职信。
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {content ? `${content.length} 字符` : ''}
          </span>
          <Button size="sm" variant="outline" onClick={onCopy} disabled={!content}>
            <Copy className="size-3.5" /> 复制
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
