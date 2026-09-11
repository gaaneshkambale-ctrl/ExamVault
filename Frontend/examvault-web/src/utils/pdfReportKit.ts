// Shared jsPDF branding/layout primitives - originally built for the per-student
// result report (generateResultPdf.ts) and extracted here so any other admin PDF
// export (eg. exportAdvanceExamReportPdf.ts) can look like the same product
// instead of each report reinventing its own header/footer/panel/table style.
import { jsPDF } from 'jspdf';

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const MARGIN = 14;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const FOOTER_Y = PAGE_HEIGHT - 12;

// Matched to the real site theme (index.css) rather than a generic blue -
// --bs-primary is #4f46e5 (indigo), --bs-success #198754, --bs-danger
// #dc3545. AMBER/GRAY have no site override (still Bootstrap-ish defaults)
// - #ffc107 in particular is too pale/yellow to read as bold report text,
// so AMBER stays a real, legible amber rather than that exact hex.
export const BRAND = { r: 79, g: 70, b: 229 };
export const GREEN = { r: 25, g: 135, b: 84 };
export const RED = { r: 220, g: 53, b: 69 };
export const GRAY = { r: 148, g: 163, b: 184 };
export const AMBER = { r: 217, g: 119, b: 6 };
export const TEXT_DARK = { r: 15, g: 23, b: 42 };
export const TEXT_MUTED = { r: 100, g: 116, b: 139 };
export const BORDER = { r: 226, g: 232, b: 240 };
export const PANEL_BG = { r: 248, g: 250, b: 252 };
export const AMBER_BG = { r: 254, g: 243, b: 199 };

// The real product domain (see project memory: multi-tenant SaaS plan).
export const WEBSITE = 'www.examvaults.in';

export type RgbColor = { r: number; g: number; b: number };

export function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

export function setColor(doc: jsPDF, method: 'setTextColor' | 'setFillColor' | 'setDrawColor', c: RgbColor) {
  doc[method](c.r, c.g, c.b);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface LogoImage {
  dataUrl: string;
  ratio: number;
}

const LOGO_URL = '/examvault-logo.png';
// Intrinsic size of public/examvault-logo.png (verified via `file`) - used to keep the
// embedded image's aspect ratio correct without re-measuring it at render time.
const LOGO_INTRINSIC_RATIO = 512 / 178;

/** Fetches the app's real logo (same file the app header/login screen use via BrandMark.tsx) and inlines it as a data URL for jsPDF's addImage. Falls back to null (plain text) rather than fail the whole report if it can't be loaded. */
export async function loadLogo(): Promise<LogoImage | null> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read logo image'));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, ratio: LOGO_INTRINSIC_RATIO };
  } catch {
    return null;
  }
}

/** Draws the real ExamVault logo (image, wordmark and tagline all baked into the PNG); falls back to plain "ExamVault" text if the image couldn't be loaded. */
export function drawHeaderBrand(doc: jsPDF, x: number, y: number, heightMm: number, logo: LogoImage | null) {
  if (logo) {
    doc.addImage(logo.dataUrl, 'PNG', x, y, heightMm * logo.ratio, heightMm);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('ExamVault', x, y + heightMm * 0.7);
  }
}

/** Draws the standard branded page header (logo, title, optional tagline, and a brand-colored rule) and returns the y position content should start at below it. */
export function drawPageHeader(
  doc: jsPDF,
  title: string,
  opts: { logo: LogoImage | null; generatedAt?: Date; tagline?: string; logoHeightMm?: number } = { logo: null },
): number {
  let y = MARGIN;
  const logoH = opts.logoHeightMm ?? 13;
  drawHeaderBrand(doc, MARGIN, y, logoH, opts.logo);
  if (opts.generatedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(`Generated On: ${opts.generatedAt.toLocaleString()}`, PAGE_WIDTH - MARGIN, y + 2, { align: 'right' });
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(title, PAGE_WIDTH - MARGIN, y + 10, { align: 'right' });
  if (opts.tagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(opts.tagline, PAGE_WIDTH - MARGIN, y + 15, { align: 'right' });
  }
  setColor(doc, 'setDrawColor', BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 19, PAGE_WIDTH - MARGIN, y + 19);
  y += 25;
  return y;
}

export function drawFooter(doc: jsPDF, page: number, totalPages: number, generatedAt: Date, logo: LogoImage | null) {
  setColor(doc, 'setDrawColor', BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 4, PAGE_WIDTH - MARGIN, FOOTER_Y - 4);
  if (logo) {
    const h = 4.5;
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, FOOTER_Y - h + 0.5, h * logo.ratio, h);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('ExamVault', MARGIN, FOOTER_Y);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(`Generated on: ${generatedAt.toLocaleString()}`, PAGE_WIDTH - MARGIN, FOOTER_Y - 3, { align: 'right' });
  doc.text(`Page ${page} of ${totalPages}`, PAGE_WIDTH - MARGIN, FOOTER_Y + 2, { align: 'right' });
}

/** Stamps drawFooter onto every page already in the document - call once, after all content is drawn, so the true final page count is known. */
export function stampFooters(doc: jsPDF, generatedAt: Date, logo: LogoImage | null): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, generatedAt, logo);
  }
}

export function panel(doc: jsPDF, x: number, y: number, w: number, h: number) {
  setColor(doc, 'setFillColor', PANEL_BG);
  setColor(doc, 'setDrawColor', BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

export function panelTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(text, x, y);
}

/** Truncates text with an ellipsis so it never exceeds maxWidth - assumes the caller has already set the font/size it'll be measured and drawn in. */
export function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  if (maxWidth <= 0 || doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = '…';
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + ellipsis) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

/**
 * A "Label:  Value" row. `labelW` is the usual/minimum gap from label to
 * value, but a label longer than that (eg. "Academic Year" in a narrow
 * column) pushes the value start out further instead of drawing on top of
 * it. Pass `maxWidth` (the total width available from `x`, eg. the column's
 * width) to also truncate a long value with an ellipsis instead of letting
 * it bleed into whatever is drawn to the right (the next column, a border) -
 * omit it only when the caller already knows the value is always short.
 */
export function fieldRow(doc: jsPDF, label: string, value: string, x: number, y: number, labelW: number, maxWidth?: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(label, x, y);
  const valueX = x + Math.max(labelW, doc.getTextWidth(label) + 2);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'setTextColor', TEXT_DARK);
  const displayValue = String(value || '—');
  doc.text(maxWidth === undefined ? displayValue : fitText(doc, displayValue, x + maxWidth - valueX), valueX, y);
}

/** Ensures the given content height fits above the footer on the current page; otherwise starts a fresh page first. Call before drawing a block whose height is known ahead of time. */
export function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 6) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Traces a donut chart by stepping around the circle in small line segments per slice - jsPDF has no native "percentage arc" primitive. */
export function drawDonutChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  slices: { value: number; color: RgbColor }[],
  centerValue: string,
  centerLabel: string,
) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  doc.setLineWidth(7);
  if (total <= 0) {
    setColor(doc, 'setDrawColor', BORDER);
    doc.circle(cx, cy, r, 'S');
  } else {
    let startDeg = -90;
    const step = 2.5;
    slices.forEach((slice) => {
      if (slice.value <= 0) return;
      const endDeg = startDeg + (slice.value / total) * 360;
      setColor(doc, 'setDrawColor', slice.color);
      let prevX = cx + r * Math.cos((startDeg * Math.PI) / 180);
      let prevY = cy + r * Math.sin((startDeg * Math.PI) / 180);
      for (let deg = startDeg + step; deg <= endDeg; deg += step) {
        const px = cx + r * Math.cos((deg * Math.PI) / 180);
        const py = cy + r * Math.sin((deg * Math.PI) / 180);
        doc.line(prevX, prevY, px, py);
        prevX = px;
        prevY = py;
      }
      const fx = cx + r * Math.cos((endDeg * Math.PI) / 180);
      const fy = cy + r * Math.sin((endDeg * Math.PI) / 180);
      doc.line(prevX, prevY, fx, fy);
      startDeg = endDeg;
    });
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(centerValue, cx, cy + 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(centerLabel, cx, cy + 6, { align: 'center' });
}

export function drawTableHeader(doc: jsPDF, x: number, y: number, colWidths: number[], headers: string[], rowH: number) {
  setColor(doc, 'setFillColor', { r: 241, g: 245, b: 249 });
  doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  let cx = x + 2;
  headers.forEach((h, i) => {
    doc.text(h.toUpperCase(), cx, y + rowH - 2.3);
    cx += colWidths[i];
  });
}

export function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  dotColor: RgbColor,
  label: string,
  value: string,
  valueColor: RgbColor,
  caption?: string,
) {
  panel(doc, x, y, w, h);
  setColor(doc, 'setFillColor', dotColor);
  doc.circle(x + 6, y + 7, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  // Wraps to 2 lines for a narrow card (eg. a 6-up KPI row) - the existing
  // 10mm gap down to the value already leaves enough room for a wrapped
  // label, so this is a no-op for the wider 4-up cards that already fit
  // their label on one line.
  doc.text(doc.splitTextToSize(label, w - 12), x + 10, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(doc, 'setTextColor', valueColor);
  doc.text(value, x + 6, y + 18);
  if (caption) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(caption, x + 6, y + 23.5);
  }
}

export type BadgeIcon = 'check' | 'cross' | 'dot';

// jsPDF has no icon font/SVG support, so these are drawn as plain vector
// strokes - a checkmark (two line segments), a cross (two crossing lines),
// or a plain dot for a neutral status like "Absent" that isn't pass/fail.
function drawBadgeIcon(doc: jsPDF, type: BadgeIcon, cx: number, cy: number, color: RgbColor) {
  if (type === 'dot') {
    setColor(doc, 'setFillColor', color);
    doc.circle(cx, cy, 0.6, 'F');
    return;
  }
  setColor(doc, 'setDrawColor', color);
  doc.setLineWidth(0.45);
  if (type === 'check') {
    doc.line(cx - 0.9, cy, cx - 0.2, cy + 0.7);
    doc.line(cx - 0.2, cy + 0.7, cx + 1, cy - 0.8);
  } else {
    doc.line(cx - 0.7, cy - 0.7, cx + 0.7, cy + 0.7);
    doc.line(cx - 0.7, cy + 0.7, cx + 0.7, cy - 0.7);
  }
}

/** Small filled pill (rounded rect + bold text, optionally a check/cross/dot icon before the text), eg. a "Present"/"Absent" status cell in a dense table. Returns the pill's width so a caller can center or chain it. */
export function drawBadge(doc: jsPDF, text: string, x: number, y: number, bg: RgbColor, textColor: RgbColor, icon?: BadgeIcon): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  const padX = 2.2;
  const iconW = icon ? 3.4 : 0;
  const h = 4.2;
  const w = doc.getTextWidth(text) + padX * 2 + iconW;
  setColor(doc, 'setFillColor', bg);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  if (icon) {
    drawBadgeIcon(doc, icon, x + padX + 1, y + h / 2, textColor);
  }
  setColor(doc, 'setTextColor', textColor);
  doc.text(text, x + padX + iconW, y + h - 1.35);
  return w;
}

/** A single horizontal bar divided into proportional colored segments (eg. Pass/Fail/Absent) - a more legible alternative to a donut when one segment dominates the total. */
export function drawStackedBar(doc: jsPDF, x: number, y: number, w: number, h: number, segments: { value: number; color: RgbColor }[]) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  setColor(doc, 'setFillColor', BORDER);
  doc.rect(x, y, w, h, 'F');
  if (total <= 0) return;
  let cx = x;
  segments.forEach((s) => {
    if (s.value <= 0) return;
    const segW = (s.value / total) * w;
    setColor(doc, 'setFillColor', s.color);
    doc.rect(cx, y, segW, h, 'F');
    cx += segW;
  });
}
