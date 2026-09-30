// PDF export for the Advance Exam Report page - built on the same branding kit
// (pdfReportKit.ts) as the per-student result report (generateResultPdf.ts) so
// every PDF this app produces looks like the same product: real logo, brand
// color, rounded "panel" info/stat cards, a donut chart, the same muted-gray
// table header style, and the same branded footer with page numbers.
import { jsPDF } from 'jspdf';
import type { ExamResponse } from '../types/exam';
import type { ExamResultScheme } from './examResultScheme';
import type { AdvanceReportData } from './advanceExamReport';
import type { AdvanceReportExtras } from './advanceExamReportAnalysis';
import { getRollNumberLabelForType } from '../constants/organizationTypeFieldCatalog';
import {
  AMBER,
  AMBER_BG,
  BORDER,
  BRAND,
  CONTENT_WIDTH,
  GRAY,
  GREEN,
  MARGIN,
  PAGE_WIDTH,
  RED,
  TEXT_DARK,
  TEXT_MUTED,
  drawBadge,
  drawDonutChart,
  type BadgeIcon,
  drawCenteredBrandHeader,
  drawStackedBar,
  drawStatCard,
  drawTableHeader,
  ensurePageSpace,
  fieldRow,
  fitText,
  loadTenantBranding,
  panel,
  panelTitle,
  sanitizeFilename,
  setColor,
  stampFooters,
} from './pdfReportKit';

// "Not Submitted" rows are capped so a large roster with few real
// submissions doesn't turn page 1 into a wall of "Not Submitted" -
// Submitted rows (the actual substance of the report) are never capped or
// dropped.
const MAX_ABSENT_ROWS = 15;
const TOP_PERFORMERS_LIMIT = 5;
const HARDEST_QUESTIONS_LIMIT = 5;
// Below this many submitted candidates, pass-rate/difficulty conclusions
// ("raise difficulty", "review content coverage") are one or two people's
// results dressed up as a class-wide finding - not a statistical threshold,
// just a floor under which those specific claims stop being drawn (see
// buildRecommendations and the "limited sample" banner below).
const MIN_SAMPLE_SIZE = 5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** A colored-dot bullet line, wrapped to maxWidth. Returns the y position after the line(s). */
function bulletLine(doc: jsPDF, x: number, y: number, text: string, color: { r: number; g: number; b: number }, maxWidth: number): number {
  setColor(doc, 'setFillColor', color);
  doc.circle(x + 1.2, y - 1, 1.1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  setColor(doc, 'setTextColor', TEXT_DARK);
  const lines = doc.splitTextToSize(text, maxWidth - 5);
  doc.text(lines, x + 5, y);
  return y + lines.length * 4 + 2;
}

function buildRecommendations(report: AdvanceReportData, scheme: ExamResultScheme, hasLowPerformingQuestions: boolean): string[] {
  const recommendations: string[] = [];
  // report.presentCount/absentCount are candidates with/without a
  // SUBMITTED result (see computeExamAttendance's SUBMITTED-ONLY REPORTING
  // BOUNDARY note in advanceExamReport.ts) - "submissionPct", not
  // "attendancePct", since this data can't actually tell who showed up/
  // started vs. who never opened the exam at all.
  const submissionPct = pct(report.presentCount, report.totalCandidates);

  if (submissionPct < 50) {
    recommendations.push(`Submission rate is low (${submissionPct}%) - review communication and reminders sent to candidates.`);
  }
  // Pass-rate/difficulty conclusions only below MIN_SAMPLE_SIZE - "raise the
  // difficulty" or "review content coverage" off a single candidate's result
  // is a strong claim resting on noise, not signal (see MIN_SAMPLE_SIZE's
  // own comment). A plain, non-judgmental caveat replaces them instead of
  // just silently omitting the recommendation, so the reader knows *why*
  // nothing's being said about pass rate rather than assuming it was missed.
  if (scheme.hasPassFailConcept && report.presentCount > 0) {
    if (report.presentCount < MIN_SAMPLE_SIZE) {
      recommendations.push(
        `Only ${report.presentCount} candidate(s) submitted this exam - treat the pass rate and difficulty as indicative only until more submissions are recorded.`,
      );
    } else if (report.passRate === 0) {
      recommendations.push('No candidate passed - review exam difficulty and content coverage before the next attempt.');
    } else if (report.passRate < 50) {
      recommendations.push(`${scheme.outcomeLabels.pass} rate is below half (${report.passRate}%) - consider providing additional practice material.`);
    } else if (report.passRate >= 80) {
      recommendations.push(`Strong ${scheme.outcomeLabels.pass.toLowerCase()} rate (${report.passRate}%) - consider raising difficulty for future assessments.`);
    }
  }
  if (report.absentCount > 0) {
    recommendations.push(`${report.absentCount} candidate(s) did not submit - consider a re-scheduled attempt for them.`);
  }
  if (hasLowPerformingQuestions) {
    recommendations.push('Review the lowest performing questions below to identify weak topics for future coaching.');
  }

  return recommendations.slice(0, 4);
}

export async function exportAdvanceExamReportPdf(
  exam: ExamResponse,
  scheme: ExamResultScheme,
  report: AdvanceReportData,
  extras: AdvanceReportExtras,
): Promise<void> {
  const branding = await loadTenantBranding();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const TITLE = 'EXAM PERFORMANCE REPORT';
  const SUBTITLE = 'Detailed Examination Performance & Outcome Analysis';

  // Letterhead-style header matching the per-student result report's own
  // header exactly (logo top-left, institution name/motto/address/
  // registration CENTERED, title centered below the rule) - was previously
  // drawPageHeader's different logo-left/title-right layout with the
  // institution name in its own separate left-aligned block, which looked
  // inconsistent sitting next to the other report types. showGeneratedAt is
  // off here - the footer on every page already prints "Generated on" with
  // full date+time and a page number, so the header doesn't need its own
  // copy of the same timestamp.
  let y = drawCenteredBrandHeader(doc, branding, generatedAt, TITLE, SUBTITLE, false);

  // Exam Information panel - 2 columns x 6 rows (was 3x4, before that 4x3 -
  // each narrowing attempt just moved the truncation point: a real exam
  // title/code still didn't fit the ~1/3-width column even with ellipsis
  // backstop, e.g. "C# Programming - Final Assessment" rendering as
  // "C# Programming …". Halving the column count roughly doubles the width
  // available to every field, which is the actual fix - ellipsis-truncation
  // in fieldRow is still there as the backstop for whatever's still too long.
  const infoPanelRows = 6;
  const infoPanelH = 8 + (infoPanelRows - 1) * 6.5 + 5;
  panel(doc, MARGIN, y, CONTENT_WIDTH, infoPanelH);
  {
    const colW = CONTENT_WIDTH / 2;
    // Available width from a field's x to its column's own right edge (just
    // shy of the divider line) - passed as fieldRow's maxWidth so a value
    // longer than even this wider column gets ellipsis-truncated instead of
    // bleeding into the next column.
    const fieldMaxW = colW - 8;
    const passPct = exam.totalMarks > 0 ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 0;
    const startDate = exam.startAtUtc ? new Date(exam.startAtUtc) : null;
    const endDate = exam.endAtUtc ? new Date(exam.endAtUtc) : null;

    let c1y = y + 8;
    fieldRow(doc, 'Exam Title', exam.title, MARGIN + 4, c1y, 24, fieldMaxW);
    c1y += 6.5;
    fieldRow(doc, 'Exam Code', exam.examCode ?? '—', MARGIN + 4, c1y, 24, fieldMaxW);
    c1y += 6.5;
    fieldRow(doc, 'Exam Type', exam.examTypeName ?? '—', MARGIN + 4, c1y, 24, fieldMaxW);
    c1y += 6.5;
    fieldRow(doc, 'Status', exam.status, MARGIN + 4, c1y, 24, fieldMaxW);
    c1y += 6.5;
    fieldRow(doc, 'Exam Date', startDate ? startDate.toLocaleDateString() : '—', MARGIN + 4, c1y, 24, fieldMaxW);
    c1y += 6.5;
    fieldRow(doc, 'Start Time', startDate ? startDate.toLocaleTimeString() : '—', MARGIN + 4, c1y, 24, fieldMaxW);

    const c2x = MARGIN + colW + 2;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.line(c2x - 2, y + 5, c2x - 2, y + infoPanelH - 5);
    let c2y = y + 8;
    fieldRow(doc, 'End Time', endDate ? endDate.toLocaleTimeString() : '—', c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Mode', 'Online Exam', c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Duration', `${exam.durationMinutes} min`, c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Total Marks', String(exam.totalMarks), c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, scheme.passingLabel, `${exam.passingMarks} (${passPct}%)`, c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Academic Year', startDate ? String(startDate.getFullYear()) : '—', c2x + 2, c2y, 24, fieldMaxW);
  }
  y += infoPanelH + 6;

  // KPI cards - 6-up when this exam type has a pass/fail concept, 4-up otherwise.
  const statGap = 3;
  const statCardH = 26;
  if (scheme.hasPassFailConcept) {
    const statW = (CONTENT_WIDTH - statGap * 5) / 6;
    const cardX = (i: number) => MARGIN + (statW + statGap) * i;
    drawStatCard(doc, cardX(0), y, statW, statCardH, BRAND, 'Total Candidates', String(report.totalCandidates), TEXT_DARK);
    drawStatCard(doc, cardX(1), y, statW, statCardH, BRAND, 'Submitted', String(report.presentCount), TEXT_DARK, `${pct(report.presentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(2), y, statW, statCardH, GREEN, scheme.outcomeLabels.pass, String(report.passCount), GREEN, `${pct(report.passCount, report.presentCount)}% of submitted`);
    drawStatCard(
      doc,
      cardX(3),
      y,
      statW,
      statCardH,
      RED,
      scheme.outcomeLabels.fail,
      String(report.presentCount - report.passCount),
      RED,
      `${pct(report.presentCount - report.passCount, report.presentCount)}% of submitted`,
    );
    drawStatCard(doc, cardX(4), y, statW, statCardH, GRAY, 'Not Submitted', String(report.absentCount), TEXT_DARK, `${pct(report.absentCount, report.totalCandidates)}% of total`);
    drawStatCard(doc, cardX(5), y, statW, statCardH, AMBER, 'Pass Rate', `${report.passRate}%`, AMBER, 'Overall pass rate');
  } else {
    const statW = (CONTENT_WIDTH - statGap * 3) / 4;
    const cardX = (i: number) => MARGIN + (statW + statGap) * i;
    drawStatCard(doc, cardX(0), y, statW, statCardH, BRAND, 'Total Candidates', String(report.totalCandidates), TEXT_DARK);
    drawStatCard(doc, cardX(1), y, statW, statCardH, GREEN, 'Submitted', String(report.presentCount), TEXT_DARK, `${pct(report.presentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(2), y, statW, statCardH, GRAY, 'Not Submitted', String(report.absentCount), TEXT_DARK, `${pct(report.absentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(3), y, statW, statCardH, AMBER, 'Average Score', `${report.averagePercentage}%`, AMBER);
  }
  y += statCardH + 6;

  // Small-sample caveat - shown once here rather than repeated in every
  // panel below. Score Distribution, Section-wise Performance, Lowest
  // Performing Questions, Exam Insights and Recommendations all read
  // differently once the reader knows the submitted count is this low;
  // buildRecommendations separately softens its own pass-rate claims below
  // this same MIN_SAMPLE_SIZE threshold.
  if (report.presentCount > 0 && report.presentCount < MIN_SAMPLE_SIZE) {
    const bannerH = 9;
    setColor(doc, 'setFillColor', AMBER_BG);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, bannerH, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(doc, 'setTextColor', AMBER);
    doc.text(
      `Limited sample - only ${report.presentCount} candidate(s) submitted. Analytics below may not be statistically meaningful.`,
      MARGIN + 4,
      y + bannerH / 2 + 1.3,
    );
    y += bannerH + 5;
  }

  // Result Split (stacked bar) / Score Distribution (bars) / Key Highlights (bullets).
  const col3Gap = 5;
  const col3W = (CONTENT_WIDTH - col3Gap * 2) / 3;
  const col3H = 58;
  y = ensurePageSpace(doc, y, col3H);

  const resultX = MARGIN;
  panel(doc, resultX, y, col3W, col3H);
  panelTitle(doc, scheme.hasPassFailConcept ? 'Result Split' : 'Submission Split', resultX + 4, y + 7);
  {
    const barW = col3W - 8;
    const barY = y + 16;
    const barH = 6;
    const slices = scheme.hasPassFailConcept
      ? [
          { label: scheme.outcomeLabels.pass, value: report.passCount, color: GREEN },
          { label: scheme.outcomeLabels.fail, value: report.presentCount - report.passCount, color: RED },
          { label: 'Not Submitted', value: report.absentCount, color: GRAY },
        ]
      : [
          { label: 'Submitted', value: report.presentCount, color: GREEN },
          { label: 'Not Submitted', value: report.absentCount, color: GRAY },
        ];
    drawStackedBar(doc, resultX + 4, barY, barW, barH, slices);
    let ly = barY + barH + 6;
    slices.forEach((s) => {
      setColor(doc, 'setFillColor', s.color);
      doc.circle(resultX + 6, ly - 1, 1.4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(s.label, resultX + 9, ly);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.value} (${pct(s.value, report.totalCandidates)}%)`, resultX + col3W - 4, ly, { align: 'right' });
      ly += 7;
    });
  }

  const distX = MARGIN + col3W + col3Gap;
  panel(doc, distX, y, col3W, col3H);
  panelTitle(doc, 'Score Distribution', distX + 4, y + 7);
  {
    const distMaxCount = Math.max(1, ...report.distribution.map((b) => b.count));
    const labelW = col3W * 0.28;
    const barX = distX + labelW + 4;
    const barMaxW = col3W - labelW - 4 - 12;
    let by = y + 13;
    report.distribution.forEach((bucket) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(bucket.label, distX + 4, by + 3.5);
      setColor(doc, 'setFillColor', { r: 226, g: 232, b: 240 });
      doc.rect(barX, by, barMaxW, 3.5, 'F');
      setColor(doc, 'setFillColor', BRAND);
      doc.rect(barX, by, Math.max(0, (bucket.count / distMaxCount) * barMaxW), 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(String(bucket.count), barX + barMaxW + 3, by + 3.2);
      by += 8;
    });
  }

  const highlightsX = MARGIN + (col3W + col3Gap) * 2;
  panel(doc, highlightsX, y, col3W, col3H);
  panelTitle(doc, 'Key Highlights', highlightsX + 4, y + 7);
  {
    const highlightLines = [
      `${report.totalCandidates} candidate(s) registered for this exam.`,
      `${report.presentCount} candidate(s) submitted (${pct(report.presentCount, report.totalCandidates)}%).`,
      scheme.hasPassFailConcept ? `${report.passCount} candidate(s) ${scheme.outcomeLabels.pass.toLowerCase()}.` : null,
      scheme.hasPassFailConcept ? `${scheme.outcomeLabels.pass} rate is ${report.passRate}%.` : null,
      report.absentCount > 0 ? `${report.absentCount} candidate(s) did not submit (${pct(report.absentCount, report.totalCandidates)}%).` : null,
    ].filter((l): l is string => l !== null);
    let hy = y + 14;
    highlightLines.forEach((line) => {
      hy = bulletLine(doc, highlightsX + 4, hy, line, GREEN, col3W - 8);
    });
  }
  y += col3H + 6;

  // Student Performance Details.
  const rollLabel = getRollNumberLabelForType(branding.organizationType);
  const columns = scheme.showRankPercentile
    ? [
        { label: rollLabel, width: 18 },
        { label: 'Student Name', width: 36 },
        { label: 'Status', width: 18 },
        { label: 'Score', width: 18 },
        { label: '%', width: 14 },
        { label: 'Result', width: 18 },
        { label: 'Rank', width: 12 },
        { label: 'Pctile', width: 16 },
        { label: 'Submitted On', width: 32 },
      ]
    : [
        { label: rollLabel, width: 22 },
        { label: 'Student Name', width: 46 },
        { label: 'Status', width: 22 },
        { label: 'Score', width: 22 },
        { label: '%', width: 18 },
        { label: 'Result', width: 22 },
        { label: 'Submitted On', width: 30 },
      ];
  const colWidths = columns.map((c) => c.width);
  const ROW_HEIGHT = 7;

  y = ensurePageSpace(doc, y, ROW_HEIGHT * 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Student Performance Details', MARGIN, y);
  y += 6;
  drawTableHeader(doc, MARGIN, y, colWidths, columns.map((c) => c.label), ROW_HEIGHT);
  y += ROW_HEIGHT;

  const drawRow = (
    cells: string[],
    badges: { colIndex: number; text: string; bg: { r: number; g: number; b: number }; fg: { r: number; g: number; b: number }; icon?: BadgeIcon }[],
    index: number,
  ) => {
    const beforeY = y;
    y = ensurePageSpace(doc, y, ROW_HEIGHT);
    if (y !== beforeY) {
      // Landed on a fresh page mid-table - repeat the header so the new
      // page's rows are still legible on their own.
      drawTableHeader(doc, MARGIN, y, colWidths, columns.map((c) => c.label), ROW_HEIGHT);
      y += ROW_HEIGHT;
    }
    if (index % 2 === 1) {
      setColor(doc, 'setFillColor', { r: 250, g: 250, b: 251 });
      doc.rect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    setColor(doc, 'setTextColor', TEXT_DARK);
    let x = MARGIN + 2;
    cells.forEach((cell, i) => {
      const col = columns[i];
      const badge = badges.find((b) => b.colIndex === i);
      if (badge) {
        drawBadge(doc, badge.text, x, y + 1.4, badge.bg, badge.fg, badge.icon);
      } else {
        doc.text(fitText(doc, cell, col.width - 3), x, y + ROW_HEIGHT - 2.7);
      }
      x += col.width;
    });
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + ROW_HEIGHT, MARGIN + CONTENT_WIDTH, y + ROW_HEIGHT);
    y += ROW_HEIGHT;
  };

  const STATUS_BG = { r: 220, g: 252, b: 231 };
  const STATUS_FG = GREEN;
  const ABSENT_BG = { r: 241, g: 245, b: 249 };
  const ABSENT_FG = TEXT_MUTED;
  const RESULT_PASS_BG = { r: 220, g: 252, b: 231 };
  const RESULT_FAIL_BG = { r: 254, g: 226, b: 226 };

  report.studentRows.forEach((r, i) => {
    const statusColIndex = 2;
    const resultColIndex = 5;
    const cells = [
      r.student.rollNumber ?? '—',
      r.student.fullName,
      'Submitted',
      `${r.attempt.totalScore}/${r.attempt.totalMarks}`,
      `${round1(r.percent)}%`,
      scheme.hasPassFailConcept ? (r.attempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail) : '—',
      ...(scheme.showRankPercentile ? [r.rank !== null ? String(r.rank) : '—', r.percentile !== null ? `${r.percentile}%` : '—'] : []),
      new Date(r.attempt.submittedAtUtc).toLocaleDateString(),
    ];
    const badges = [{ colIndex: statusColIndex, text: 'Submitted', bg: STATUS_BG, fg: STATUS_FG, icon: 'check' as BadgeIcon }];
    if (scheme.hasPassFailConcept) {
      badges.push({
        colIndex: resultColIndex,
        text: r.attempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail,
        bg: r.attempt.passed ? RESULT_PASS_BG : RESULT_FAIL_BG,
        fg: r.attempt.passed ? GREEN : RED,
        icon: r.attempt.passed ? ('check' as BadgeIcon) : ('cross' as BadgeIcon),
      });
    }
    drawRow(cells, badges, i);
  });

  const absentToShow = report.absentStudents.slice(0, MAX_ABSENT_ROWS);
  absentToShow.forEach((s, i) => {
    const statusColIndex = 2;
    const resultColIndex = 5;
    const cells = [
      s.rollNumber ?? '—',
      s.fullName,
      'Not Submitted',
      '—',
      '—',
      'Not Submitted',
      ...(scheme.showRankPercentile ? ['—', '—'] : []),
      '—',
    ];
    const badges = [
      { colIndex: statusColIndex, text: 'Not Submitted', bg: ABSENT_BG, fg: ABSENT_FG, icon: 'dot' as BadgeIcon },
      { colIndex: resultColIndex, text: 'Not Submitted', bg: ABSENT_BG, fg: ABSENT_FG, icon: 'dot' as BadgeIcon },
    ];
    drawRow(cells, badges, report.studentRows.length + i);
  });

  if (report.absentStudents.length > MAX_ABSENT_ROWS) {
    y = ensurePageSpace(doc, y, 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(
      `... and ${report.absentStudents.length - MAX_ABSENT_ROWS} more absent student(s) (showing first ${MAX_ABSENT_ROWS}).`,
      MARGIN,
      y + 4,
      { align: 'left' },
    );
    y += 8;
  }

  // ---------- Page 2 ----------
  doc.addPage();
  y = drawCenteredBrandHeader(doc, branding, generatedAt, TITLE, SUBTITLE, false);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Exam Performance Analysis', MARGIN, y);
  y += 8;

  const avgScoreMarks =
    report.studentRows.length === 0
      ? 0
      : round1(report.studentRows.reduce((sum, r) => sum + r.attempt.totalScore, 0) / report.studentRows.length);

  // Performance Summary / Top Performers / Submission Overview.
  const row2Gap = 5;
  const row2W = (CONTENT_WIDTH - row2Gap * 2) / 3;
  const row2H = 66;
  y = ensurePageSpace(doc, y, row2H);

  const summaryX = MARGIN;
  panel(doc, summaryX, y, row2W, row2H);
  panelTitle(doc, 'Performance Summary', summaryX + 4, y + 7);
  {
    const rows: [string, string][] = [
      ['Highest Score', report.highest ? `${report.highest.attempt.totalScore} / ${report.highest.attempt.totalMarks}` : '—'],
      ['Highest %', report.highest ? `${round1(report.highest.percent)}%` : '—'],
      ['Lowest Score', report.lowest ? `${report.lowest.attempt.totalScore} / ${report.lowest.attempt.totalMarks}` : '—'],
      ['Lowest %', report.lowest ? `${round1(report.lowest.percent)}%` : '—'],
      ['Average Score', report.studentRows.length > 0 ? `${avgScoreMarks} / ${exam.totalMarks}` : '—'],
      ['Average %', `${report.averagePercentage}%`],
      ...(scheme.hasPassFailConcept ? ([[`${scheme.outcomeLabels.pass} Rate`, `${report.passRate}%`]] as [string, string][]) : []),
    ];
    let sy = y + 14;
    rows.forEach(([label, value]) => {
      fieldRow(doc, label, value, summaryX + 4, sy, row2W - 30);
      sy += 6.5;
    });
  }

  const topX = MARGIN + row2W + row2Gap;
  panel(doc, topX, y, row2W, row2H);
  panelTitle(doc, 'Top Performers', topX + 4, y + 7);
  {
    const top = report.studentRows.slice(0, TOP_PERFORMERS_LIMIT);
    if (top.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text('No candidate has submitted this exam.', topX + 4, y + 16);
    } else {
      const tCols = [{ label: '#', width: 8 }, { label: 'Student', width: row2W - 8 - 18 - 8 }, { label: 'Score', width: 18 }];
      drawTableHeader(doc, topX + 4, y + 10, tCols.map((c) => c.width), tCols.map((c) => c.label), 5.5);
      let ty = y + 10 + 5.5;
      top.forEach((r, i) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        setColor(doc, 'setTextColor', TEXT_DARK);
        let cx = topX + 4 + 2;
        doc.text(String(i + 1), cx, ty + 4);
        cx += tCols[0].width;
        doc.text(fitText(doc, r.student.fullName, tCols[1].width - 3), cx, ty + 4);
        cx += tCols[1].width;
        doc.setFont('helvetica', 'bold');
        doc.text(`${round1(r.percent)}%`, cx, ty + 4);
        ty += 6.5;
      });
    }
  }

  const attendanceX = MARGIN + (row2W + row2Gap) * 2;
  panel(doc, attendanceX, y, row2W, row2H);
  panelTitle(doc, 'Submission Overview', attendanceX + 4, y + 7);
  {
    // Donut centered at the top of the panel, legend below it spanning the
    // panel's FULL width - not beside the donut, sharing a narrow leftover
    // strip of it, the way this used to be laid out. That side-by-side
    // approach kept being too cramped for "Not Submitted" (13 characters)
    // regardless of how the donut/legend column split was tuned - it
    // collided with the value on one line, or the column still wasn't wide
    // enough and it silently ellipsis-truncated to "Not Submi…" even once
    // stacked onto its own line (see git history - both were tried and
    // rejected). Putting the legend on its own full-width rows below the
    // donut instead - exactly the layout "Result Split" (this same
    // Performance Summary/Top Performers/Submission Overview row's page-1
    // counterpart) already uses successfully for the same label length -
    // sidesteps the narrow-column problem entirely instead of continuing
    // to fight it.
    //
    // Radius back to 15 (the original size, and the same one
    // generateResultPdf.ts's own drawDonutChart call uses) - it was only
    // ever shrunk to 11/13 to free up room for the old side-by-side
    // legend, which doesn't exist anymore now the legend moved below.
    // drawDonutChart's center text is a fixed 15pt/7pt regardless of `r`
    // (not scaled to the radius), so at the smaller radius "Total
    // Candidates" (17 characters - longer than the other caller's "Score")
    // rendered cramped against the ring; 15 is the size this text was
    // already proven to fit at.
    const donutCx = attendanceX + row2W / 2;
    const donutCy = y + 28;
    drawDonutChart(
      doc,
      donutCx,
      donutCy,
      15,
      [
        { value: report.presentCount, color: GREEN },
        { value: report.absentCount, color: GRAY },
      ],
      String(report.totalCandidates),
      'Total Candidates',
    );
    let ly = donutCy + 20;
    ([
      ['Submitted', GREEN, report.presentCount],
      ['Not Submitted', GRAY, report.absentCount],
    ] as [string, { r: number; g: number; b: number }, number][]).forEach(([label, color, count]) => {
      setColor(doc, 'setFillColor', color);
      doc.circle(attendanceX + 6, ly - 1, 1.4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(label, attendanceX + 9, ly);
      doc.setFont('helvetica', 'bold');
      doc.text(`${count} (${pct(count, report.totalCandidates)}%)`, attendanceX + row2W - 4, ly, { align: 'right' });
      ly += 7;
    });
  }
  y += row2H + 6;

  // Section-wise Performance / Question Analysis. A question every
  // submitting candidate got right (100% correct) isn't "difficult" and doesn't belong
  // in a lowest-performing-questions panel just to fill a slot - excluded
  // outright rather than shown with a misleadingly high percentage next to
  // a title implying it's a weak spot.
  const row3Gap = 5;
  const row3W = (CONTENT_WIDTH - row3Gap) / 2;
  const sectionRows = Math.max(1, extras.sectionStats.length);
  const lowPerforming = extras.questionDifficulty.filter((q) => q.percentCorrect < 100).slice(0, HARDEST_QUESTIONS_LIMIT);
  const questionRows = Math.min(HARDEST_QUESTIONS_LIMIT, Math.max(1, lowPerforming.length));
  const row3H = Math.max(24 + sectionRows * 6, 24 + questionRows * 10);
  y = ensurePageSpace(doc, y, row3H);

  const sectionX = MARGIN;
  panel(doc, sectionX, y, row3W, row3H);
  panelTitle(doc, 'Section-wise Performance', sectionX + 4, y + 7);
  {
    if (extras.sectionStats.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text('No section data available for this exam.', sectionX + 4, y + 16);
    } else {
      const sCols = [
        { label: '#', width: 7 },
        { label: 'Section', width: row3W - 8 - 7 - 14 - 16 - 16 },
        { label: 'Total Q.', width: 14 },
        { label: 'Avg Score', width: 16 },
        { label: 'Accuracy', width: 16 },
      ];
      drawTableHeader(doc, sectionX + 4, y + 10, sCols.map((c) => c.width), sCols.map((c) => c.label), 5.5);
      let sy = y + 10 + 5.5;
      extras.sectionStats.forEach((s, i) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        setColor(doc, 'setTextColor', TEXT_DARK);
        let cx = sectionX + 4 + 2;
        doc.text(String(i + 1), cx, sy + 4);
        cx += sCols[0].width;
        doc.text(fitText(doc, s.sectionName, sCols[1].width - 3), cx, sy + 4);
        cx += sCols[1].width;
        doc.text(String(s.totalQuestions), cx, sy + 4);
        cx += sCols[2].width;
        doc.text(String(s.avgScore), cx, sy + 4);
        cx += sCols[3].width;
        doc.text(`${s.accuracy}%`, cx, sy + 4);
        sy += 6;
      });
    }
  }

  const questionX = MARGIN + row3W + row3Gap;
  panel(doc, questionX, y, row3W, row3H);
  panelTitle(doc, 'Lowest Performing Questions', questionX + 4, y + 7);
  {
    if (lowPerforming.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(
        extras.questionDifficulty.length === 0
          ? 'No question data available for this exam.'
          : 'Every question was answered correctly by every candidate.',
        questionX + 4,
        y + 16,
      );
    } else {
      let qy = y + 14;
      lowPerforming.forEach((q) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        setColor(doc, 'setTextColor', TEXT_DARK);
        doc.text(fitText(doc, q.questionText, row3W - 30), questionX + 4, qy);
        doc.setFont('helvetica', 'bold');
        setColor(doc, 'setTextColor', q.percentCorrect < 50 ? RED : GREEN);
        doc.text(`${q.percentCorrect}%`, questionX + row3W - 4, qy, { align: 'right' });
        qy += 10;
      });
    }
  }
  y += row3H + 6;

  // Exam Insights / Recommendations.
  const insightLines = [
    report.highest ? `Highest Score: ${round1(report.highest.percent)}% (${report.highest.student.fullName})` : null,
    report.lowest ? `Lowest Score: ${round1(report.lowest.percent)}% (${report.lowest.student.fullName})` : null,
    scheme.hasPassFailConcept ? `${scheme.outcomeLabels.pass} Rate: ${report.passRate}%` : null,
    `Average Score: ${report.averagePercentage}%`,
    report.mostCommonBucket && report.mostCommonBucket.count > 0
      ? `Most Common Score Range: ${report.mostCommonBucket.label} (${report.mostCommonBucket.count} student(s))`
      : null,
  ].filter((l): l is string => l !== null);
  const recommendations = buildRecommendations(report, scheme, lowPerforming.length > 0);

  const row4Gap = 5;
  const row4W = (CONTENT_WIDTH - row4Gap) / 2;
  // Generous per-line estimate (assumes up to 2 wrapped lines per bullet) -
  // these panels aren't individually paginated, so underestimating would
  // let text run past the panel's rounded-rect bottom edge.
  const row4H = Math.max(20 + insightLines.length * 10, 20 + recommendations.length * 10);
  y = ensurePageSpace(doc, y, row4H);

  const insightsX = MARGIN;
  panel(doc, insightsX, y, row4W, row4H);
  panelTitle(doc, 'Exam Insights', insightsX + 4, y + 7);
  {
    let iy = y + 14;
    insightLines.forEach((line) => {
      iy = bulletLine(doc, insightsX + 4, iy, line, BRAND, row4W - 8);
    });
  }

  const recX = MARGIN + row4W + row4Gap;
  panel(doc, recX, y, row4W, row4H);
  panelTitle(doc, 'Recommendations', recX + 4, y + 7);
  {
    let ry = y + 14;
    recommendations.forEach((line) => {
      ry = bulletLine(doc, recX + 4, ry, line, AMBER, row4W - 8);
    });
  }
  y += row4H + 8;

  // Closing - real "generated by" metadata instead of a fabricated
  // authorized-signature block (no real signatory identity to show).
  y = ensurePageSpace(doc, y, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('This report is confidential and intended for internal institutional use only.', MARGIN, y + 4);
  if (extras.generatedByName) {
    doc.text(`Generated by: ${extras.generatedByName}`, MARGIN, y + 9);
  }
  doc.setFont('helvetica', 'italic');
  doc.text('This is a system-generated report and does not require a physical signature.', PAGE_WIDTH - MARGIN, y + 4, {
    align: 'right',
  });

  stampFooters(
    doc,
    generatedAt,
    branding.logo,
    branding.includeAddressInFooter ? branding.addressLine : null,
    branding.showLogoOnReports,
    branding.showPageNumbers,
  );
  doc.save(`${sanitizeFilename(exam.title)}-advanced-report.pdf`);
}
