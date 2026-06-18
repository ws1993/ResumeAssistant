import { useReactToPrint } from 'react-to-print';
import type { RefObject } from 'react';

export function useResumePrint(args: {
  contentRef: RefObject<HTMLElement | null>;
  documentTitle?: string;
}): () => void {
  const handlePrint = useReactToPrint({
    contentRef: args.contentRef as RefObject<HTMLElement | null>,
    documentTitle: args.documentTitle,
    pageStyle: `
      @page { size: A4; margin: 0; }
      html, body { background: #ffffff !important; color: #111827 !important; }
      .no-print, [data-no-print] { display: none !important; }
      .resume-page {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always;
      }
    `,
  });
  return () => handlePrint();
}
