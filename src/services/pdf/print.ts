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
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111827 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, [data-no-print] { display: none !important; }
      /* Reset any transform that might be on the cloned content */
      * {
        transform: none !important;
        transform-origin: top left !important;
      }
      .resume-page {
        box-shadow: none !important;
        margin: 0 !important;
        padding: 18mm 16mm !important;
        width: 210mm !important;
        min-height: 297mm !important;
        page-break-after: always;
      }
    `,
  });
  return () => handlePrint();
}
