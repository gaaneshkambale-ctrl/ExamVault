import { jsPDF } from 'jspdf';
import { getGrade } from '../types/result';
import type { AdminAttemptResultResponse, ResultSummaryResponse } from '../types/result';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 12;

const BRAND = { r: 37, g: 99, b: 235 };
const GREEN = { r: 22, g: 163, b: 74 };
const RED = { r: 220, g: 38, b: 38 };
const GRAY = { r: 148, g: 163, b: 184 };
const AMBER = { r: 217, g: 119, b: 6 };
const TEXT_DARK = { r: 15, g: 23, b: 42 };
const TEXT_MUTED = { r: 100, g: 116, b: 139 };
const BORDER = { r: 226, g: 232, b: 240 };
const PANEL_BG = { r: 248, g: 250, b: 252 };
const AMBER_BG = { r: 254, g: 243, b: 199 };

// The real product domain (see project memory: multi-tenant SaaS plan) - the
// mockup this report is based on showed a placeholder ".com" domain that isn't
// the actual one, so this uses the real address instead of copying it verbatim.
const WEBSITE = 'www.examvaults.in';

export interface ResultPdfSectionStat {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxScore: number;
}

export interface ResultPdfContext {
  studentName?: string;
  studentEmail?: string;
  rollNumber?: string | null;
  examCode?: string | null;
  examType?: string | null;
  durationMinutes?: number;
  attemptStartedAtUtc?: string | null;
  integrityScorePercent?: number;
  /** Per-section breakdown. Omit when the caller hasn't loaded section data - the report falls back to a single "Overall" row rather than fabricate a split. */
  sectionStats?: ResultPdfSectionStat[];
  /** Average accuracy % across every student's attempt on this exam. Omit (rather than guess) when the caller doesn't have every attempt loaded - e.g. the student's own "My Result" page can't see other students' results. */
  averageAccuracyPercent?: number;
  /** This student's 1-based rank by score among everyone who attempted this exam, and the total attempt count it was ranked against. Omit together when not available. */
  rank?: number;
  totalParticipants?: number;
}

const QUOTE_TEXT = 'Success is the sum of small efforts, repeated day in and day out.';
const QUOTE_AUTHOR = 'Robert Collier';

function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

function setColor(doc: jsPDF, method: 'setTextColor' | 'setFillColor' | 'setDrawColor', c: { r: number; g: number; b: number }) {
  doc[method](c.r, c.g, c.b);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isSkipped(q: { selectedOptionId: string | null; selectedOptionIds: string[] | null; answerText: string | null }): boolean {
  return q.selectedOptionId === null && (!q.selectedOptionIds || q.selectedOptionIds.length === 0) && !q.answerText;
}

// AttemptScorer.cs hardcodes IsCorrect = false for every CodeProgram question (there's
// no auto-scoring engine - an admin assigns MarksAwarded by hand), so a fully-credited
// code/SQL answer would otherwise show as "Incorrect" everywhere in this report. isCorrect
// stays authoritative for MCQ/MultiSelect, where the backend does compute it properly.
export function isQuestionCorrect(q: { questionType: string; marks: number; marksAwarded: number; isPendingGrading: boolean; isCorrect: boolean }): boolean {
  if (q.questionType === 'CodeProgram') {
    return !q.isPendingGrading && q.marks > 0 && q.marksAwarded >= q.marks;
  }
  return q.isCorrect;
}

interface LogoImage {
  dataUrl: string;
  ratio: number;
}

const LOGO_URL = '/examvault-logo.png';
// Intrinsic size of public/examvault-logo.png (verified via `file`) - used to keep the
// embedded image's aspect ratio correct without re-measuring it at render time.
const LOGO_INTRINSIC_RATIO = 512 / 178;

/** Fetches the app's real logo (same file the app header/login screen use via BrandMark.tsx) and inlines it as a data URL for jsPDF's addImage. Falls back to null (plain text) rather than fail the whole report if it can't be loaded. */
async function loadLogo(): Promise<LogoImage | null> {
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
function drawHeaderBrand(doc: jsPDF, x: number, y: number, heightMm: number, logo: LogoImage | null) {
  if (logo) {
    doc.addImage(logo.dataUrl, 'PNG', x, y, heightMm * logo.ratio, heightMm);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('ExamVault', x, y + heightMm * 0.7);
  }
}

function drawFooter(doc: jsPDF, page: number, totalPages: number, generatedAt: Date, logo: LogoImage | null) {
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

function panel(doc: jsPDF, x: number, y: number, w: number, h: number) {
  setColor(doc, 'setFillColor', PANEL_BG);
  setColor(doc, 'setDrawColor', BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

function panelTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(text, x, y);
}

function fieldRow(doc: jsPDF, label: string, value: string, x: number, y: number, labelW: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(String(value || '—'), x + labelW, y);
}

/** Ensures the given content height fits above the footer on the current page; otherwise starts a fresh page first. Call before drawing a block whose height is known ahead of time. */
function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 6) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Traces a donut chart by stepping around the circle in small line segments per slice - jsPDF has no native "percentage arc" primitive. */
function drawDonutChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  slices: { value: number; color: { r: number; g: number; b: number } }[],
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

function drawTableHeader(doc: jsPDF, x: number, y: number, colWidths: number[], headers: string[], rowH: number) {
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

function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  dotColor: { r: number; g: number; b: number },
  label: string,
  value: string,
  valueColor: { r: number; g: number; b: number },
  caption?: string,
) {
  panel(doc, x, y, w, h);
  setColor(doc, 'setFillColor', dotColor);
  doc.circle(x + 6, y + 7, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(label, x + 10, y + 8);
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

/** Draws one student's full report (both pages) into an already-created jsPDF document, starting on a fresh page unless this is the very first report in the document (which already has jsPDF's initial blank page 1 to use). Shared by the single-student download and the whole-exam booklet, so the two can never visually drift apart. */
function drawStudentReport(
  doc: jsPDF,
  result: AdminAttemptResultResponse | ResultSummaryResponse,
  context: ResultPdfContext,
  logo: LogoImage | null,
  generatedAt: Date,
  isFirstInDocument: boolean,
): void {
  if (!isFirstInDocument) {
    doc.addPage();
  }
  const questions = result.questions ?? [];

  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
  const correctCount = questions.filter((q) => !isSkipped(q) && isQuestionCorrect(q)).length;
  const incorrectCount = questions.filter((q) => !isSkipped(q) && !isQuestionCorrect(q)).length;
  const skippedCount = questions.filter(isSkipped).length;
  const totalQuestions = questions.length;
  const accuracy = totalQuestions - skippedCount > 0 ? Math.round((correctCount / (totalQuestions - skippedCount)) * 100) : 0;
  const integrity = context.integrityScorePercent;
  const passingPercent = result.totalMarks > 0 ? Math.round((result.passingMarks / result.totalMarks) * 100) : 0;

  const startDate = context.attemptStartedAtUtc ? new Date(context.attemptStartedAtUtc) : null;
  const endDate = new Date(result.submittedAtUtc);
  const timeTakenMinutes = startDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : null;
  const timeTakenPercentOfAllotted =
    timeTakenMinutes !== null && context.durationMinutes ? Math.round((timeTakenMinutes / context.durationMinutes) * 100) : null;

  const sections: ResultPdfSectionStat[] =
    context.sectionStats && context.sectionStats.length > 0
      ? context.sectionStats
      : [
          {
            name: 'Overall',
            total: totalQuestions,
            correct: correctCount,
            incorrect: incorrectCount,
            skipped: skippedCount,
            score: result.totalScore,
            maxScore: result.totalMarks,
          },
        ];

  // ---------- Page 1 ----------
  let y = MARGIN;
  const logoH = 13;
  drawHeaderBrand(doc, MARGIN, y, logoH, logo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(`Generated On: ${generatedAt.toLocaleString()}`, PAGE_WIDTH - MARGIN, y + 2, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Exam Result Report', PAGE_WIDTH - MARGIN, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('Your Learning Journey, Our Commitment', PAGE_WIDTH - MARGIN, y + 15, { align: 'right' });
  setColor(doc, 'setDrawColor', BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 19, PAGE_WIDTH - MARGIN, y + 19);
  y += 25;

  // Student + Examination info (one combined panel)
  const infoPanelH = 54;
  panel(doc, MARGIN, y, CONTENT_WIDTH, infoPanelH);
  {
    const leftW = CONTENT_WIDTH * 0.36;
    const avatarR = 9;
    const avatarCx = MARGIN + 6 + avatarR;
    const avatarCy = y + 16;
    setColor(doc, 'setFillColor', { r: 219, g: 234, b: 254 });
    doc.circle(avatarCx, avatarCy, avatarR, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, 'setTextColor', BRAND);
    doc.text(getInitials(context.studentName ?? 'Unknown'), avatarCx, avatarCy + 1.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text(context.studentName ?? 'Unknown Student', avatarCx + avatarR + 5, avatarCy - 1);

    let fy = y + 32;
    fieldRow(doc, 'Roll No.', context.rollNumber ?? '—', MARGIN + 4, fy, 22);
    fy += 6;
    fieldRow(doc, 'Email', context.studentEmail ?? '—', MARGIN + 4, fy, 22);

    const examX = MARGIN + leftW + 4;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.line(examX - 2, y + 6, examX - 2, y + infoPanelH - 6);

    let ey = y + 9;
    fieldRow(doc, 'Exam Title', result.examTitle, examX + 2, ey, 26);
    ey += 6;
    fieldRow(doc, 'Exam Code', context.examCode ?? '—', examX + 2, ey, 26);
    ey += 6;
    fieldRow(doc, 'Exam Type', context.examType ?? '—', examX + 2, ey, 26);
    ey += 6;
    fieldRow(doc, 'Exam Date', startDate ? startDate.toLocaleDateString() : endDate.toLocaleDateString(), examX + 2, ey, 26);
    ey += 6;
    fieldRow(
      doc,
      'Exam Time',
      startDate ? `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}` : endDate.toLocaleTimeString(),
      examX + 2,
      ey,
      26,
    );
    ey += 6;
    fieldRow(doc, 'Duration', context.durationMinutes ? `${context.durationMinutes} Minutes` : '—', examX + 2, ey, 26);
    ey += 6;
    fieldRow(doc, 'Total Questions', String(totalQuestions), examX + 2, ey, 26);
  }
  y += infoPanelH + 6;

  // Score Obtained / Passing Marks / Result Status / Grade
  const statGap = 4;
  const statCardH = 27;
  const statW = (CONTENT_WIDTH - statGap * 3) / 4;
  drawStatCard(doc, MARGIN, y, statW, statCardH, GREEN, 'Score Obtained', `${result.totalScore} / ${result.totalMarks}`, TEXT_DARK, `${percentage}%`);
  drawStatCard(
    doc,
    MARGIN + (statW + statGap),
    y,
    statW,
    statCardH,
    BRAND,
    'Passing Marks',
    `${result.passingMarks} / ${result.totalMarks}`,
    TEXT_DARK,
    `(${passingPercent}%)`,
  );
  drawStatCard(
    doc,
    MARGIN + (statW + statGap) * 2,
    y,
    statW,
    statCardH,
    result.passed ? GREEN : RED,
    'Result Status',
    result.passed ? 'Passed' : 'Failed',
    result.passed ? GREEN : RED,
  );
  drawStatCard(doc, MARGIN + (statW + statGap) * 3, y, statW, statCardH, AMBER, 'Grade', grade, AMBER);
  y += statCardH + 6;

  // Section-wise Performance table
  const tableColW = [8, CONTENT_WIDTH - 8 - 24 * 5 - 12, 22, 18, 18, 18, 20, 18];
  const rowH = 5.5;
  const sectionTableH = 6 + rowH * (sections.length + 1) + 4;
  // A wide section breakdown (many rows) can outgrow the remaining space on the page -
  // push the whole table onto a fresh page rather than let rows spill past the panel
  // (and past the footer) the way a fixed/clamped panel height used to.
  y = ensurePageSpace(doc, y, sectionTableH);
  panel(doc, MARGIN, y, CONTENT_WIDTH, sectionTableH);
  panelTitle(doc, 'Section-wise Performance', MARGIN + 4, y + 7);
  {
    let ty = y + 10;
    drawTableHeader(doc, MARGIN + 4, ty, tableColW, ['#', 'Section', 'Total Q.', 'Correct', 'Incorrect', 'Skipped', 'Score', 'Accuracy'], rowH);
    ty += rowH;
    let totalQ = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalScore = 0;
    let totalMax = 0;
    sections.forEach((s, i) => {
      if (i % 2 === 1) {
        setColor(doc, 'setFillColor', { r: 250, g: 250, b: 251 });
        doc.rect(MARGIN + 4, ty, tableColW.reduce((a, b) => a + b, 0), rowH, 'F');
      }
      const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const cells = [String(i + 1), s.name, String(s.total), String(s.correct), String(s.incorrect), String(s.skipped), `${s.score}/${s.maxScore}`, `${acc}%`];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      setColor(doc, 'setTextColor', TEXT_DARK);
      let cx = MARGIN + 4 + 2;
      cells.forEach((c, ci) => {
        doc.text(c, cx, ty + rowH - 1.8);
        cx += tableColW[ci];
      });
      totalQ += s.total;
      totalCorrect += s.correct;
      totalIncorrect += s.incorrect;
      totalSkipped += s.skipped;
      totalScore += s.score;
      totalMax += s.maxScore;
      ty += rowH;
    });
    setColor(doc, 'setFillColor', { r: 241, g: 245, b: 249 });
    doc.rect(MARGIN + 4, ty, tableColW.reduce((a, b) => a + b, 0), rowH, 'F');
    const totalAcc = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
    const totalCells = ['', 'Total', String(totalQ), String(totalCorrect), String(totalIncorrect), String(totalSkipped), `${totalScore}/${totalMax}`, `${totalAcc}%`];
    doc.setFont('helvetica', 'bold');
    let cx = MARGIN + 4 + 2;
    totalCells.forEach((c, ci) => {
      doc.text(c, cx, ty + rowH - 1.8);
      cx += tableColW[ci];
    });
  }
  y += sectionTableH + 6;

  // Score Distribution donut + Section-wise Accuracy bars
  const accuracyPanelH = 14 + sections.length * 7 + 4;
  const distPanelH = 50;
  const twoColH = Math.max(accuracyPanelH, distPanelH);
  y = ensurePageSpace(doc, y, twoColH);
  const colW = (CONTENT_WIDTH - 6) / 2;

  panel(doc, MARGIN, y, colW, twoColH);
  panelTitle(doc, 'Score Distribution', MARGIN + 4, y + 7);
  {
    const donutCx = MARGIN + colW * 0.28;
    const donutCy = y + twoColH / 2 + 3;
    drawDonutChart(
      doc,
      donutCx,
      donutCy,
      15,
      [
        { value: correctCount, color: GREEN },
        { value: incorrectCount, color: RED },
        { value: skippedCount, color: GRAY },
      ],
      `${percentage}%`,
      'Score',
    );
    const legendItems: [string, { r: number; g: number; b: number }, number][] = [
      ['Correct', GREEN, correctCount],
      ['Incorrect', RED, incorrectCount],
      ['Skipped', GRAY, skippedCount],
    ];
    let ly = donutCy - 10;
    const legendX = MARGIN + colW * 0.55;
    legendItems.forEach(([label, color, count]) => {
      setColor(doc, 'setFillColor', color);
      doc.circle(legendX, ly, 1.4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(label, legendX + 4, ly + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(`${count} (${totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0}%)`, MARGIN + colW - 4, ly + 1, { align: 'right' });
      ly += 8;
    });
  }

  const accuracyX = MARGIN + colW + 6;
  panel(doc, accuracyX, y, colW, twoColH);
  panelTitle(doc, 'Section-wise Accuracy', accuracyX + 4, y + 7);
  {
    const labelW = colW * 0.32;
    const barX = accuracyX + labelW + 4;
    const barMaxW = colW - labelW - 4 - 16;
    let by = y + 13;
    sections.forEach((s) => {
      const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      setColor(doc, 'setTextColor', TEXT_DARK);
      const nameLines = doc.splitTextToSize(s.name, labelW - 2);
      doc.text(nameLines[0], accuracyX + 4, by + 3.5);
      setColor(doc, 'setFillColor', { r: 226, g: 232, b: 240 });
      doc.rect(barX, by, barMaxW, 3.5, 'F');
      setColor(doc, 'setFillColor', BRAND);
      doc.rect(barX, by, Math.max(0, (acc / 100) * barMaxW), 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(`${acc}%`, barX + barMaxW + 3, by + 3.2);
      by += 7;
    });
  }
  y += twoColH + 6;

  // Performance Analysis mini-stats + Remarks
  const bottomRowH = 28;
  y = ensurePageSpace(doc, y, bottomRowH);
  const perfW = colW;
  panel(doc, MARGIN, y, perfW, bottomRowH);
  panelTitle(doc, 'Performance Analysis', MARGIN + 4, y + 7);
  {
    const miniStats: { label: string; value: string; caption?: string; captionColor?: { r: number; g: number; b: number } }[] = [];
    if (timeTakenMinutes !== null) {
      miniStats.push({
        label: 'Time Taken',
        value: `${timeTakenMinutes} min`,
        caption: timeTakenPercentOfAllotted !== null ? `${timeTakenPercentOfAllotted}% of time` : undefined,
      });
    }
    {
      let accuracyCaption: string | undefined;
      let accuracyCaptionColor: { r: number; g: number; b: number } | undefined;
      if (context.averageAccuracyPercent !== undefined) {
        if (accuracy > context.averageAccuracyPercent) {
          accuracyCaption = 'Above average';
          accuracyCaptionColor = GREEN;
        } else if (accuracy < context.averageAccuracyPercent) {
          accuracyCaption = 'Below average';
          accuracyCaptionColor = RED;
        } else {
          accuracyCaption = 'Average';
        }
      }
      miniStats.push({ label: 'Accuracy', value: `${accuracy}%`, caption: accuracyCaption, captionColor: accuracyCaptionColor });
    }
    if (context.rank !== undefined && context.totalParticipants !== undefined && context.totalParticipants > 0) {
      const percentile = Math.max(1, Math.round((context.rank / context.totalParticipants) * 100));
      miniStats.push({ label: 'Your Rank', value: `${context.rank} / ${context.totalParticipants}`, caption: `Top ${percentile}%` });
    }
    if (integrity !== undefined) {
      miniStats.push({ label: 'Integrity Score', value: `${integrity}%` });
    }
    const slotW = perfW / miniStats.length;
    miniStats.forEach((stat, i) => {
      const sx = MARGIN + slotW * i + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(stat.label, sx, y + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(stat.value, sx, y + 20);
      if (stat.caption) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, 'setTextColor', stat.captionColor ?? TEXT_MUTED);
        doc.text(stat.caption, sx, y + 24.5);
      }
    });
  }

  const remarksX = MARGIN + perfW + 6;
  setColor(doc, 'setFillColor', AMBER_BG);
  setColor(doc, 'setDrawColor', { r: 253, g: 230, b: 138 });
  doc.setLineWidth(0.3);
  doc.roundedRect(remarksX, y, colW, bottomRowH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', result.passed ? GREEN : RED);
  doc.text(result.passed ? 'Good Performance!' : 'Needs Improvement', remarksX + 4, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setColor(doc, 'setTextColor', TEXT_DARK);
  const remarksText = result.passed
    ? 'You have passed this exam. Keep up the good work!'
    : 'You did not meet the passing criteria this time. Review the weak sections above and try again.';
  doc.text(doc.splitTextToSize(remarksText, colW - 8), remarksX + 4, y + 15);
  y += bottomRowH + 8;

  // Closing quote + brand footer line
  y = ensurePageSpace(doc, y, 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  setColor(doc, 'setTextColor', TEXT_DARK);
  const quoteLines = doc.splitTextToSize(`"${QUOTE_TEXT}"`, CONTENT_WIDTH * 0.6);
  doc.text(quoteLines, MARGIN, y + 4);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(`- ${QUOTE_AUTHOR}`, MARGIN, y + 4 + quoteLines.length * 4.2 + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text(WEBSITE, PAGE_WIDTH - MARGIN, y + 4, { align: 'right' });

  // ---------- Page 2 ----------
  doc.addPage();
  y = MARGIN;
  drawHeaderBrand(doc, MARGIN, y, 9, logo);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Exam Result Report', PAGE_WIDTH - MARGIN, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('Question-wise Details', PAGE_WIDTH - MARGIN, y + 9, { align: 'right' });
  setColor(doc, 'setDrawColor', BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 13, PAGE_WIDTH - MARGIN, y + 13);
  y += 19;

  panelTitle(doc, 'Question-wise Results', MARGIN, y);
  y += 5;

  const qColW = [8, CONTENT_WIDTH - 8 - 30 - 30 - 20 - 14, 30, 30, 20, 14];
  const qRowH = 6.5;
  // Footers are drawn once, for every page, in the final pass at the end of this
  // function (after the true page count is known) - not here, to avoid stacking a
  // placeholder "Page N of N" under the corrected one once more pages are added.
  const ensureSpace = (needed: number) => {
    y = ensurePageSpace(doc, y, needed);
  };

  ensureSpace(qRowH);
  drawTableHeader(doc, MARGIN, y, qColW, ['#', 'Question', 'Your Answer', 'Correct Answer', 'Status', 'Marks'], qRowH * 0.62);
  y += qRowH * 0.62;

  const answerColW = qColW[2] - 3;
  questions.forEach((q, i) => {
    let yourAnswer = '—';
    let correctAnswer = '—';
    if (q.options && q.options.length > 0) {
      const selectedIds = q.selectedOptionIds && q.selectedOptionIds.length > 0 ? q.selectedOptionIds : q.selectedOptionId ? [q.selectedOptionId] : [];
      yourAnswer = selectedIds.length > 0 ? q.options.filter((o) => selectedIds.includes(o.optionId)).map((o) => o.optionText).join(', ') : '—';
      const correctOpts = q.options.filter((o) => o.isCorrect).map((o) => o.optionText);
      correctAnswer = correctOpts.length > 0 ? correctOpts.join(', ') : '—';
    } else if (q.answerText !== null) {
      yourAnswer = q.answerText || '—';
      correctAnswer = q.isPendingGrading ? 'Pending review' : '—';
    }

    const questionLines = doc.splitTextToSize(`${i + 1}. ${q.questionText}`, qColW[1] - 3);
    const yourLines = doc.splitTextToSize(yourAnswer, answerColW);
    const correctLines = doc.splitTextToSize(correctAnswer, qColW[3] - 3);
    const lineCount = Math.max(questionLines.length, yourLines.length, correctLines.length, 1);
    const cellH = Math.max(qRowH, lineCount * 3.6 + 2.5);

    ensureSpace(cellH);
    if (i % 2 === 1) {
      setColor(doc, 'setFillColor', { r: 250, g: 250, b: 251 });
      doc.rect(MARGIN, y, qColW.reduce((a, b) => a + b, 0), cellH, 'F');
    }

    let cx = MARGIN + 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text(String(i + 1), cx, y + 4);
    cx += qColW[0];
    doc.text(questionLines, cx, y + 4);
    cx += qColW[1];
    doc.text(yourLines, cx, y + 4);
    cx += qColW[2];
    setColor(doc, 'setTextColor', GREEN);
    doc.text(correctLines, cx, y + 4);
    setColor(doc, 'setTextColor', TEXT_DARK);
    cx += qColW[3];

    const questionCorrect = isQuestionCorrect(q);
    const statusLabel = isSkipped(q) ? 'Skipped' : q.isPendingGrading ? 'Pending' : questionCorrect ? 'Correct' : 'Incorrect';
    const statusColor = isSkipped(q) ? GRAY : q.isPendingGrading ? AMBER : questionCorrect ? GREEN : RED;
    setColor(doc, 'setTextColor', statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(statusLabel, cx, y + 4);
    cx += qColW[4];

    doc.setFont('helvetica', 'normal');
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text(`${q.marksAwarded}/${q.marks}`, cx, y + 4);

    y += cellH;
  });

  y += 5;
  ensureSpace(10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('This is a computer-generated report and does not require a physical signature.', MARGIN, y + 4);
}

function stampFooters(doc: jsPDF, generatedAt: Date, logo: LogoImage | null): void {
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, generatedAt, logo);
  }
}

export async function generateResultPdf(
  result: AdminAttemptResultResponse | ResultSummaryResponse,
  context: ResultPdfContext = {},
): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  drawStudentReport(doc, result, context, logo, generatedAt, true);
  stampFooters(doc, generatedAt, logo);
  doc.save(`${sanitizeFilename(result.examTitle)}-result.pdf`);
}

export interface ExamResultBookletEntry {
  result: AdminAttemptResultResponse | ResultSummaryResponse;
  context: ResultPdfContext;
}

/** One combined PDF for a whole exam - every student's full report (page 1 summary + page 2 question-wise detail), one after another, reusing the exact same per-student drawing as the single-student download so the two never disagree. Can run to many pages for a large class (2+ pages per student). */
export async function generateExamResultsBooklet(examTitle: string, entries: ExamResultBookletEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  entries.forEach(({ result, context }, i) => {
    drawStudentReport(doc, result, context, logo, generatedAt, i === 0);
  });
  stampFooters(doc, generatedAt, logo);
  doc.save(`${sanitizeFilename(examTitle)}-all-results.pdf`);
}
