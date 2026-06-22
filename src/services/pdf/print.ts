import { useReactToPrint } from 'react-to-print';
import type { RefObject } from 'react';
import type { PageSetup } from '@/components/resume/PageSetupDialog';
import { DEFAULT_PAGE_SETUP } from '@/components/resume/PageSetupDialog';

export function useResumePrint(args: {
  contentRef: RefObject<HTMLElement | null>;
  documentTitle?: string;
  pageSetup?: PageSetup;
}): () => void {
  const setup = args.pageSetup ?? DEFAULT_PAGE_SETUP;
  const pageWidth = setup.pageSize === 'Letter' ? '216mm' : '210mm';
  const pageHeight = setup.pageSize === 'Letter' ? '279mm' : '297mm';

  const handlePrint = useReactToPrint({
    contentRef: args.contentRef as RefObject<HTMLElement | null>,
    documentTitle: args.documentTitle,
    pageStyle: `
      @page { size: ${setup.pageSize}; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111827 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, [data-no-print] { display: none !important; }
      * {
        transform: none !important;
        transform-origin: top left !important;
      }
      .resume-page {
        box-shadow: none !important;
        margin: 0 !important;
        padding: ${setup.marginTop}mm ${setup.marginRight}mm ${setup.marginBottom}mm ${setup.marginLeft}mm !important;
        width: ${pageWidth} !important;
        min-height: ${pageHeight} !important;
        page-break-after: always;
      }
    `,
  });
  return () => handlePrint();
}
