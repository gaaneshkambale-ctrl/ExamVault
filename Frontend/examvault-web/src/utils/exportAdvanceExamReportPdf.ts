// Single-file PDF export for the Advance Exam Report page - manual layout
// (no jspdf-autotable in this codebase's dependencies, see generateResultPdf.ts
// for the same bare-jsPDF table-drawing approach already used elsewhere),
// mirroring the same sections the Excel export (exportAdvanceExamReportExcel.ts)
// and the on-screen page (AdvanceExamReport.tsx) already show.
import { jsPDF } from 'jspdf';
import type { ExamResponse } from '../types/exam';
import type { ExamResultScheme } from './examResultScheme';
import type { AdvanceReportData } from './advanceExamReport';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 7;

function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// Truncates with an ellipsis instead of wrapping - keeps every row a fixed
// single-line height so column alignment stays exact across the whole table,
// same tradeoff generateResultPdf.ts's own table-less body text avoids by
// wrapping (this page's rows are far denser, one per student).
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  const ellipsis = '…';
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + ellipsis) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

interface Column {
  label: string;
  width: number;
}

export async function exportAdvanceExamReportPdf(
  exam: ExamResponse,
  scheme: ExamResultScheme,
  report: AdvanceReportData,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
      return true;
    }
    return false;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Advanced Exam Report', MARGIN, y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(exam.title, MARGIN, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setTextColor(110);
  doc.text(`Exam Type: ${exam.examTypeName ?? '—'}`, MARGIN, y);
  y += 5;
  doc.text(
    `Exam Date: ${exam.startAtUtc ? new Date(exam.startAtUtc).toLocaleString() : '—'}    Duration: ${exam.durationMinutes} min`,
    MARGIN,
    y,
  );
  y += 5;
  const passPct = exam.totalMarks > 0 ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 0;
  doc.text(`Total Marks: ${exam.totalMarks}    ${scheme.passingLabel}: ${exam.passingMarks} (${passPct}%)`, MARGIN, y);
  doc.setTextColor(0);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary', MARGIN, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const summaryLines = [
    `Total Candidates: ${report.totalCandidates}`,
    `Present: ${report.presentCount} (${pct(report.presentCount, report.totalCandidates)}%)    Absent: ${report.absentCount} (${pct(report.absentCount, report.totalCandidates)}%)`,
    ...(scheme.hasPassFailConcept
      ? [
          `${scheme.outcomeLabels.pass}: ${report.passCount} (${pct(report.passCount, report.presentCount)}%)    ${scheme.outcomeLabels.fail}: ${report.presentCount - report.passCount} (${pct(report.presentCount - report.passCount, report.presentCount)}%)`,
        ]
      : []),
    `Average Score: ${report.averagePercentage}%`,
    `Highest Score: ${report.highest ? `${round1(report.highest.percent)}% (${report.highest.student.fullName})` : '—'}`,
    `Lowest Score: ${report.lowest ? `${round1(report.lowest.percent)}% (${report.lowest.student.fullName})` : '—'}`,
  ];
  summaryLines.forEach((line) => {
    ensureSpace(6);
    doc.text(line, MARGIN, y);
    y += 6;
  });
  y += 4;

  // Student table.
  const columns: Column[] = scheme.showRankPercentile
    ? [
        { label: 'Roll No', width: 18 },
        { label: 'Student Name', width: 38 },
        { label: 'Status', width: 16 },
        { label: 'Score', width: 18 },
        { label: '%', width: 14 },
        { label: 'Result', width: 20 },
        { label: 'Rank', width: 12 },
        { label: 'Pctile', width: 16 },
        { label: 'Submitted On', width: 30 },
      ]
    : [
        { label: 'Roll No', width: 22 },
        { label: 'Student Name', width: 48 },
        { label: 'Status', width: 20 },
        { label: 'Score', width: 22 },
        { label: '%', width: 18 },
        { label: 'Result', width: 24 },
        { label: 'Submitted On', width: 28 },
      ];

  const drawTableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(31, 111, 74);
    doc.setTextColor(255);
    doc.rect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT, 'F');
    let x = MARGIN;
    columns.forEach((col) => {
      doc.text(col.label, x + 2, y + ROW_HEIGHT - 2.2);
      x += col.width;
    });
    doc.setTextColor(0);
    y += ROW_HEIGHT;
  };

  ensureSpace(ROW_HEIGHT * 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Student Performance Details', MARGIN, y);
  y += 6;
  drawTableHeader();

  const drawRow = (cells: string[], isAbsent: boolean) => {
    if (ensureSpace(ROW_HEIGHT)) {
      drawTableHeader();
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isAbsent ? 140 : 0);
    let x = MARGIN;
    cells.forEach((cell, i) => {
      const col = columns[i];
      doc.text(fitText(doc, cell, col.width - 3), x + 2, y + ROW_HEIGHT - 2.2);
      x += col.width;
    });
    doc.setDrawColor(225);
    doc.line(MARGIN, y + ROW_HEIGHT, MARGIN + CONTENT_WIDTH, y + ROW_HEIGHT);
    doc.setTextColor(0);
    y += ROW_HEIGHT;
  };

  report.studentRows.forEach((r) => {
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
    drawRow(cells, false);
  });

  report.absentStudents.forEach((s) => {
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
    drawRow(cells, true);
  });

  y += 8;

  if (report.mostCommonBucket || (scheme.hasPassFailConcept && report.presentCount > 0)) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Exam Insights', MARGIN, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const insightLines = [
      report.highest ? `Highest Score: ${round1(report.highest.percent)}% (${report.highest.student.fullName})` : null,
      report.lowest ? `Lowest Score: ${round1(report.lowest.percent)}% (${report.lowest.student.fullName})` : null,
      scheme.hasPassFailConcept ? `${scheme.outcomeLabels.pass} Rate: ${report.passRate}%` : null,
      `Average Score: ${report.averagePercentage}%`,
      report.mostCommonBucket && report.mostCommonBucket.count > 0
        ? `Most Common Score Range: ${report.mostCommonBucket.label} (${report.mostCommonBucket.count} students)`
        : null,
    ].filter((line): line is string => line !== null);

    insightLines.forEach((line) => {
      ensureSpace(6);
      doc.text(`- ${line}`, MARGIN, y);
      y += 6;
    });
  }

  doc.save(`${sanitizeFilename(exam.title)}-advanced-report.pdf`);
}
