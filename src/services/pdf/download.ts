import type { ResumeDocument } from '@/schema/resume';
import type { PageSetup } from '@/components/resume/PageSetupDialog';
import { DEFAULT_PAGE_SETUP } from '@/components/resume/PageSetupDialog';

function sanitizeFilenameSegment(s: string): string {
  return s.replace(/[\\/:*?"<>|\n\r\t]+/g, '_').trim();
}

export function buildPdfFilename(doc: ResumeDocument): string {
  const name = sanitizeFilenameSegment(doc.basics.name || doc.meta.title || 'resume');
  const role = sanitizeFilenameSegment(doc.meta.targetRole || '');
  const date = new Date().toISOString().slice(0, 10);
  return [name, role, date].filter(Boolean).join('_') + '.pdf';
}

const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
};

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
 * 将浏览器计算颜色值（可能含 oklch/lab/lch）转换为纯 hex/rgb 格式。
 * html2canvas-pro / dompdf.js 的 CSS 解析器无法处理现代颜色函数。
 */
function toSafeColor(computed: string): string {
  if (!computed || computed === 'transparent' || computed === 'currentcolor') return computed;
  if (computed.startsWith('#') || computed.startsWith('rgb')) return computed;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillStyle = computed;
      return ctx.fillStyle;
    }
  } catch { /* ignore */ }
  return computed;
}

/**
 * 深克隆 DOM 节点，将所有计算颜色内联为 hex/rgb，
 * 移除所有 <style>/<link> 标签，避免 html2canvas 解析 oklch/lab 色值报错。
 * 返回一个干净的克隆节点，原始节点不受影响。
 */
function prepareCleanNodeForCapture(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;

  // 移除 <style> 和 <link> 标签，防止 html2canvas 解析样式表
  clone.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());

  // 遍历所有元素，将计算样式内联为传统格式
  const colorProps = [
    'color', 'backgroundColor', 'borderColor',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'outlineColor',
  ];
  const skipTags = new Set(['STYLE', 'SCRIPT', 'LINK', 'META', 'HEAD']);
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
  let el: HTMLElement | null;

  while ((el = walker.nextNode() as HTMLElement | null)) {
    if (skipTags.has(el.tagName)) continue;

    const computed = window.getComputedStyle(el);
    let inlineStyle = el.getAttribute('style') || '';

    for (const prop of colorProps) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'transparent' && val !== 'rgba(0, 0, 0, 0)') {
        const safe = toSafeColor(val);
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const regex = new RegExp(`(?:^|;)\\s*${cssProp}\\s*:[^;]*`, 'i');
        inlineStyle = inlineStyle.replace(regex, '');
        inlineStyle += `;${cssProp}:${safe}`;
      }
    }

    // 也处理非颜色属性中可能含颜色值的情况
    const extraProps = ['boxShadow', 'textDecoration', 'fill', 'stroke'];
    for (const prop of extraProps) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none') {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const regex = new RegExp(`(?:^|;)\\s*${cssProp}\\s*:[^;]*`, 'i');
        inlineStyle = inlineStyle.replace(regex, '');
        inlineStyle += `;${cssProp}:${val}`;
      }
    }

    if (inlineStyle) el.setAttribute('style', inlineStyle.trim());
  }

  return clone;
}

/**
 * 把一个 DOM 节点截成 PDF。
 * - 依赖懒加载 html2canvas-pro 与 jsPDF
 * - 自动按 A4 高度分页
 */
export async function downloadAsPdf(
  node: HTMLElement,
  filename: string,
  pageSetup: PageSetup = DEFAULT_PAGE_SETUP,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const dims = PAGE_DIMENSIONS[pageSetup.pageSize] ?? PAGE_DIMENSIONS.A4;

  // 临时移除祖先元素的 transform，防止 html2canvas 渲染异常
  const restoreTransforms = stripAncestorTransforms(node);

  // 克隆并清洗节点，剥离所有现代 CSS 颜色函数
  const cleanNode = prepareCleanNodeForCapture(node);

  // 临时挂载克隆节点到 DOM（html2canvas 需要节点在文档中才能渲染）
  cleanNode.style.position = 'absolute';
  cleanNode.style.left = '-9999px';
  cleanNode.style.top = '0';
  document.body.appendChild(cleanNode);

  try {
    const canvas = await html2canvas(cleanNode, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio >= 2 ? 2 : Math.max(2, window.devicePixelRatio),
      useCORS: true,
      logging: false,
    });

    // 还原 transform
    restoreTransforms();

    const pdf = new jsPDF({
      unit: 'mm',
      format: pageSetup.pageSize.toLowerCase() as 'a4' | 'letter',
      orientation: 'portrait',
    });
    const pageWidth = dims.width;
    const pageHeight = dims.height;

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
          0, offset,
          canvas.width, currentSliceHeight,
          0, 0,
          canvas.width, currentSliceHeight,
        );
        const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        if (pageIndex > 0) pdf.addPage();
        const renderHeightMm = currentSliceHeight / pxPerMm;
        pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, renderHeightMm);
        offset += sliceHeightPx;
        pageIndex += 1;
      }
    }

    pdf.save(filename);
  } finally {
    // 清理临时克隆节点
    document.body.removeChild(cleanNode);
  }
}
