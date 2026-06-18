declare module 'dompdf.js' {
  import { jsPDF } from 'jspdf';

  interface FontConfig {
    family: string;
    src: string;
    style?: string;
    weight?: string;
  }

  interface PageConfigOptions {
    content?: string | ((renderer: any, pageNum: number) => void);
    height?: number;
    contentColor?: string;
    contentFontSize?: number;
    contentPosition?: 'center' | 'centerLeft' | 'centerRight' | [number, number];
    padding?: [number, number, number, number];
  }

  interface PageConfig {
    header?: PageConfigOptions;
    footer?: PageConfigOptions;
  }

  interface Options {
    useCORS?: boolean;
    backgroundColor?: string | null;
    foreignObjectRendering?: boolean;
    divisionDisable?: boolean;
    removeContainer?: boolean;
    fontConfig?: FontConfig | FontConfig[];
    langFontConfig?: FontConfig[];
    precision?: number;
    compress?: boolean;
    putOnlyUsedFonts?: boolean;
    pagination?: boolean;
    format?: string;
    pageConfig?: PageConfig | ((pageNum: number, totalPages: number) => PageConfig | null);
    onJspdfReady?: (jspdfCtx: jsPDF) => void;
    onJspdfFinish?: (jspdfCtx: jsPDF) => void;
    encryption?: {
      userPassword?: string;
      ownerPassword?: string;
      userPermissions?: Array<'print' | 'modify' | 'copy' | 'annot-forms'>;
    };
  }

  type DompdfResult = HTMLCanvasElement | Blob;

  const dompdf: (element: HTMLElement, options?: Options) => Promise<DompdfResult>;
  export default dompdf;
}
