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
import type { MyTenant } from '../types/tenant';
import {
  AMBER,
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
  drawPageHeader,
  drawStackedBar,
  drawStatCard,
  drawTableHeader,
  ensurePageSpace,
  fieldRow,
  fitText,
  loadLogo,
  panel,
  panelTitle,
  sanitizeFilename,
  setColor,
  stampFooters,
} from './pdfReportKit';

// Absent rows are capped so a large roster with few real attempts doesn't
// turn page 1 into a wall of "Absent" - present/attempted rows (the actual
// substance of the report) are never capped or dropped.
const MAX_ABSENT_ROWS = 15;
const TOP_PERFORMERS_LIMIT = 5;
const HARDEST_QUESTIONS_LIMIT = 5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function formatAddress(org: MyTenant | undefined): string {
  if (!org) return '';
  return [org.addressLine1, org.addressLine2, org.city, org.state, org.postalCode, org.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');
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

function buildRecommendations(report: AdvanceReportData, scheme: ExamResultScheme): string[] {
  const recommendations: string[] = [];
  const attendancePct = pct(report.presentCount, report.totalCandidates);

  if (attendancePct < 50) {
    recommendations.push(`Attendance is low (${attendancePct}%) - review communication and reminders sent to candidates.`);
  }
  if (scheme.hasPassFailConcept && report.presentCount > 0) {
    if (report.passRate === 0) {
      recommendations.push('No candidate passed - review exam difficulty and content coverage before the next attempt.');
    } else if (report.passRate < 50) {
      recommendations.push(`${scheme.outcomeLabels.pass} rate is below half (${report.passRate}%) - consider providing additional practice material.`);
    } else if (report.passRate >= 80) {
      recommendations.push(`Strong ${scheme.outcomeLabels.pass.toLowerCase()} rate (${report.passRate}%) - consider raising difficulty for future assessments.`);
    }
  }
  if (report.absentCount > 0) {
    recommendations.push(`${report.absentCount} candidate(s) were absent - consider a re-scheduled attempt for them.`);
  }
  recommendations.push('Review the most difficult questions below to identify weak topics for future coaching.');

  return recommendations.slice(0, 4);
}

export async function exportAdvanceExamReportPdf(
  exam: ExamResponse,
  scheme: ExamResultScheme,
  report: AdvanceReportData,
  extras: AdvanceReportExtras,
): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const TITLE = 'EXAM PERFORMANCE REPORT';
  const SUBTITLE = 'Detailed Examination Performance & Outcome Analysis';

  let y = drawPageHeader(doc, TITLE, { logo, generatedAt, tagline: SUBTITLE });

  // Organization info - only when the caller's tenant lookup actually
  // resolved (see MyTenantController.cs); skipped rather than showing a
  // placeholder name for an org with none on file.
  if (extras.organization?.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text(extras.organization.name, MARGIN, y + 4);
    const address = formatAddress(extras.organization);
    if (address) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(address, MARGIN, y + 9);
    }
    y += address ? 14 : 9;
  }

  // Exam Information panel - 3 columns x 4 rows (was 4x3 - a real exam code
  // or a longer exam type name still needed more width per field than 4
  // narrow columns could give even with truncation; wider columns is the
  // actual fix, ellipsis-truncation is just the backstop for whatever's
  // still too long).
  const infoPanelH = 34;
  panel(doc, MARGIN, y, CONTENT_WIDTH, infoPanelH);
  {
    const colW = CONTENT_WIDTH / 3;
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

    const c2x = MARGIN + colW + 2;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.line(c2x - 2, y + 5, c2x - 2, y + infoPanelH - 5);
    let c2y = y + 8;
    fieldRow(doc, 'Exam Date', startDate ? startDate.toLocaleDateString() : '—', c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Start Time', startDate ? startDate.toLocaleTimeString() : '—', c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'End Time', endDate ? endDate.toLocaleTimeString() : '—', c2x + 2, c2y, 24, fieldMaxW);
    c2y += 6.5;
    fieldRow(doc, 'Mode', 'Online Exam', c2x + 2, c2y, 24, fieldMaxW);

    const c3x = MARGIN + colW * 2 + 2;
    doc.line(c3x - 2, y + 5, c3x - 2, y + infoPanelH - 5);
    let c3y = y + 8;
    fieldRow(doc, 'Duration', `${exam.durationMinutes} min`, c3x + 2, c3y, 24, fieldMaxW);
    c3y += 6.5;
    fieldRow(doc, 'Total Marks', String(exam.totalMarks), c3x + 2, c3y, 24, fieldMaxW);
    c3y += 6.5;
    fieldRow(doc, scheme.passingLabel, `${exam.passingMarks} (${passPct}%)`, c3x + 2, c3y, 24, fieldMaxW);
    c3y += 6.5;
    fieldRow(doc, 'Academic Year', startDate ? String(startDate.getFullYear()) : '—', c3x + 2, c3y, 24, fieldMaxW);
  }
  y += infoPanelH + 6;

  // KPI cards - 6-up when this exam type has a pass/fail concept, 4-up otherwise.
  const statGap = 3;
  const statCardH = 26;
  if (scheme.hasPassFailConcept) {
    const statW = (CONTENT_WIDTH - statGap * 5) / 6;
    const cardX = (i: number) => MARGIN + (statW + statGap) * i;
    drawStatCard(doc, cardX(0), y, statW, statCardH, BRAND, 'Total Candidates', String(report.totalCandidates), TEXT_DARK);
    drawStatCard(doc, cardX(1), y, statW, statCardH, BRAND, 'Attempted', String(report.presentCount), TEXT_DARK, `${pct(report.presentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(2), y, statW, statCardH, GREEN, scheme.outcomeLabels.pass, String(report.passCount), GREEN, `${pct(report.passCount, report.presentCount)}% of attempted`);
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
      `${pct(report.presentCount - report.passCount, report.presentCount)}% of attempted`,
    );
    drawStatCard(doc, cardX(4), y, statW, statCardH, GRAY, 'Absent', String(report.absentCount), TEXT_DARK, `${pct(report.absentCount, report.totalCandidates)}% of total`);
    drawStatCard(doc, cardX(5), y, statW, statCardH, AMBER, 'Pass Rate', `${report.passRate}%`, AMBER, 'Overall pass rate');
  } else {
    const statW = (CONTENT_WIDTH - statGap * 3) / 4;
    const cardX = (i: number) => MARGIN + (statW + statGap) * i;
    drawStatCard(doc, cardX(0), y, statW, statCardH, BRAND, 'Total Candidates', String(report.totalCandidates), TEXT_DARK);
    drawStatCard(doc, cardX(1), y, statW, statCardH, GREEN, 'Attempted', String(report.presentCount), TEXT_DARK, `${pct(report.presentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(2), y, statW, statCardH, GRAY, 'Absent', String(report.absentCount), TEXT_DARK, `${pct(report.absentCount, report.totalCandidates)}%`);
    drawStatCard(doc, cardX(3), y, statW, statCardH, AMBER, 'Average Score', `${report.averagePercentage}%`, AMBER);
  }
  y += statCardH + 6;

  // Result Split (stacked bar) / Score Distribution (bars) / Key Highlights (bullets).
  const col3Gap = 5;
  const col3W = (CONTENT_WIDTH - col3Gap * 2) / 3;
  const col3H = 58;
  y = ensurePageSpace(doc, y, col3H);

  const resultX = MARGIN;
  panel(doc, resultX, y, col3W, col3H);
  panelTitle(doc, scheme.hasPassFailConcept ? 'Result Split' : 'Attendance Split', resultX + 4, y + 7);
  {
    const barW = col3W - 8;
    const barY = y + 16;
    const barH = 6;
    const slices = scheme.hasPassFailConcept
      ? [
          { label: scheme.outcomeLabels.pass, value: report.passCount, color: GREEN },
          { label: scheme.outcomeLabels.fail, value: report.presentCount - report.passCount, color: RED },
          { label: 'Absent', value: report.absentCount, color: GRAY },
        ]
      : [
          { label: 'Present', value: report.presentCount, color: GREEN },
          { label: 'Absent', value: report.absentCount, color: GRAY },
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
      `${report.presentCount} candidate(s) attempted (${pct(report.presentCount, report.totalCandidates)}%).`,
      scheme.hasPassFailConcept ? `${report.passCount} candidate(s) ${scheme.outcomeLabels.pass.toLowerCase()}.` : null,
      scheme.hasPassFailConcept ? `${scheme.outcomeLabels.pass} rate is ${report.passRate}%.` : null,
      report.absentCount > 0 ? `${report.absentCount} candidate(s) were absent (${pct(report.absentCount, report.totalCandidates)}%).` : null,
    ].filter((l): l is string => l !== null);
    let hy = y + 14;
    highlightLines.forEach((line) => {
      hy = bulletLine(doc, highlightsX + 4, hy, line, GREEN, col3W - 8);
    });
  }
  y += col3H + 6;

  // Student Performance Details.
  const columns = scheme.showRankPercentile
    ? [
        { label: 'Roll No', width: 18 },
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
        { label: 'Roll No', width: 22 },
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
      'Present',
      `${r.attempt.totalScore}/${r.attempt.totalMarks}`,
      `${round1(r.percent)}%`,
      scheme.hasPassFailConcept ? (r.attempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail) : '—',
      ...(scheme.showRankPercentile ? [r.rank !== null ? String(r.rank) : '—', r.percentile !== null ? `${r.percentile}%` : '—'] : []),
      new Date(r.attempt.submittedAtUtc).toLocaleDateString(),
    ];
    const badges = [{ colIndex: statusColIndex, text: 'Present', bg: STATUS_BG, fg: STATUS_FG, icon: 'check' as BadgeIcon }];
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
      'Absent',
      '—',
      '—',
      'Absent',
      ...(scheme.showRankPercentile ? ['—', '—'] : []),
      '—',
    ];
    const badges = [
      { colIndex: statusColIndex, text: 'Absent', bg: ABSENT_BG, fg: ABSENT_FG, icon: 'dot' as BadgeIcon },
      { colIndex: resultColIndex, text: 'Absent', bg: ABSENT_BG, fg: ABSENT_FG, icon: 'dot' as BadgeIcon },
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
  y = drawPageHeader(doc, TITLE, { logo, generatedAt, tagline: SUBTITLE });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Exam Performance Analysis', MARGIN, y);
  y += 8;

  const avgScoreMarks =
    report.studentRows.length === 0
      ? 0
      : round1(report.studentRows.reduce((sum, r) => sum + r.attempt.totalScore, 0) / report.studentRows.length);

  // Performance Summary / Top Performers / Attendance Overview.
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
      doc.text('No candidate attempted this exam.', topX + 4, y + 16);
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
  panelTitle(doc, 'Attendance Overview', attendanceX + 4, y + 7);
  {
    const donutCx = attendanceX + row2W * 0.32;
    const donutCy = y + row2H / 2 + 4;
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
    const legendX = attendanceX + row2W * 0.62;
    let ly = donutCy - 6;
    ([
      ['Present', GREEN, report.presentCount],
      ['Absent', GRAY, report.absentCount],
    ] as [string, { r: number; g: number; b: number }, number][]).forEach(([label, color, count]) => {
      setColor(doc, 'setFillColor', color);
      doc.circle(legendX, ly, 1.4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_DARK);
      doc.text(label, legendX + 4, ly + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(`${count} (${pct(count, report.totalCandidates)}%)`, attendanceX + row2W - 4, ly + 1, { align: 'right' });
      ly += 8;
    });
  }
  y += row2H + 6;

  // Section-wise Performance / Question Analysis.
  const row3Gap = 5;
  const row3W = (CONTENT_WIDTH - row3Gap) / 2;
  const sectionRows = Math.max(1, extras.sectionStats.length);
  const questionRows = Math.min(HARDEST_QUESTIONS_LIMIT, Math.max(1, extras.questionDifficulty.length));
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
  panelTitle(doc, 'Most Difficult Questions', questionX + 4, y + 7);
  {
    const hardest = extras.questionDifficulty.slice(0, HARDEST_QUESTIONS_LIMIT);
    if (hardest.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text('No question data available for this exam.', questionX + 4, y + 16);
    } else {
      let qy = y + 14;
      hardest.forEach((q) => {
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
  const recommendations = buildRecommendations(report, scheme);

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

  stampFooters(doc, generatedAt, logo);
  doc.save(`${sanitizeFilename(exam.title)}-advanced-report.pdf`);
}
