import type { ResumeDocument } from '@/schema/resume';

function sanitizeFilenameSegment(s: string): string {
  return s.replace(/[\\/:*?"<>|\n\r\t]+/g, '_').trim();
}

export function buildPdfFilename(doc: ResumeDocument): string {
  const name = sanitizeFilenameSegment(doc.basics.name || doc.meta.title || 'resume');
  const role = sanitizeFilenameSegment(doc.meta.targetRole || '');
  const date = new Date().toISOString().slice(0, 10);
  return [name, role, date].filter(Boolean).join('_') + '.pdf';
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * 临时移除祖先元素上的 CSS transform，以确保 html2canvas 正确截图。
 * 返回一个还原函数，截图完成后必须调用。
 */
function stripAncestorTransforms(el: HTMLElement): () => void {
  const overrides: Array<{ node: HTMLElement; transform: string; origin: string; willChange: string }> = [];
  let current: HTMLElement | null = el.parentElement;
  while (current && current !== document.body) {
    const style = getComputedStyle(current);
    if (style.transform && style.transform !== 'none') {
      overrides.push({
        node: current,
        transform: current.style.transform,
        origin: current.style.transformOrigin,
        willChange: current.style.willChange,
      });
      current.style.transform = 'none';
      current.style.transformOrigin = 'top left';
      current.style.willChange = 'auto';
    }
    current = current.parentElement;
  }
  return () => {
    for (const o of overrides) {
      o.node.style.transform = o.transform;
      o.node.style.transformOrigin = o.origin;
      o.node.style.willChange = o.willChange;
    }
  };
}

/**
 * 把一个 DOM 节点截成 PDF。
 * - 依赖懒加载 html2canvas-pro 与 jsPDF
 * - 自动按 A4 高度分页
 */
export async function downloadAsPdf(node: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  // 临时移除祖先元素的 transform，防止 html2canvas 渲染异常
  const restoreTransforms = stripAncestorTransforms(node);

  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff',
    scale: window.devicePixelRatio >= 2 ? 2 : Math.max(2, window.devicePixelRatio),
    useCORS: true,
    logging: false,
  });

  // 还原 transform
  restoreTransforms();

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = A4_WIDTH_MM;
  const pageHeight = A4_HEIGHT_MM;

  const imgWidthMm = pageWidth;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  if (imgHeightMm <= pageHeight) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);
  } else {
    // 多页：按 pageHeight 切片
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 canvas context');

    const pxPerMm = canvas.width / imgWidthMm;
    const sliceHeightPx = Math.floor(pageHeight * pxPerMm);
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    let offset = 0;
    let pageIndex = 0;
    while (offset < canvas.height) {
      const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - offset);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        offset,
        canvas.width,
        currentSliceHeight,
        0,
        0,
        canvas.width,
        currentSliceHeight,
      );
      const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
      if (pageIndex > 0) pdf.addPage();
      const renderHeightMm = (currentSliceHeight / pxPerMm);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, renderHeightMm);
      offset += sliceHeightPx;
      pageIndex += 1;
    }
  }

  pdf.save(filename);
}
