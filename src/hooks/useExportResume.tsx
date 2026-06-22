import { useRef, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageSetupDialog, DEFAULT_PAGE_SETUP } from '@/components/resume/PageSetupDialog';
import type { PageSetup } from '@/components/resume/PageSetupDialog';
import { buildPdfFilename, downloadAsPdf } from '@/services/pdf/download';
import { useResumePrint } from '@/services/pdf/print';
import type { ResumeDocument } from '@/schema/resume';
import { toast } from '@/stores/toastStore';

export interface ExportResult {
  previewRef: React.RefObject<HTMLDivElement | null>;
  toolbar: React.ReactNode;
  pageSetupNode: React.ReactNode;
}

export function useExportResume(document: ResumeDocument | undefined): ExportResult {
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [pageSetup, setPageSetup] = useState<PageSetup>(DEFAULT_PAGE_SETUP);

  const filename = document ? buildPdfFilename(document) : 'resume.pdf';

  const print = useResumePrint({
    contentRef: previewRef,
    documentTitle: filename.replace(/\.pdf$/, ''),
    pageSetup,
  });

  const onDownload = async (): Promise<void> => {
    const node = previewRef.current;
    if (!node) {
      toast({ title: '未找到预览内容', variant: 'error' });
      return;
    }
    setDownloading(true);
    try {
      await downloadAsPdf(node, filename, pageSetup);
      toast({ title: 'PDF 已下载', description: filename, variant: 'success' });
    } catch (err) {
      toast({ title: 'PDF 下载失败', description: String(err), variant: 'error', durationMs: 8000 });
    } finally {
      setDownloading(false);
    }
  };

  const toolbar = document ? (
    <div className="no-print flex items-center gap-2">
      <Button size="sm" onClick={onDownload} disabled={downloading}>
        {downloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        下载 PDF
      </Button>
      <Button size="sm" variant="outline" onClick={print}>
        <Printer className="size-3.5" /> 打印
      </Button>
      <span className="text-[10px] text-muted-foreground">{filename}</span>
    </div>
  ) : null;

  const pageSetupNode = document ? (
    <div className="no-print">
      <PageSetupDialog value={pageSetup} onChange={setPageSetup} />
    </div>
  ) : null;

  return { previewRef, toolbar, pageSetupNode };
}
