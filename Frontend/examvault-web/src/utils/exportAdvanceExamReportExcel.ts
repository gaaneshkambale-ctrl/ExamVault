// Multi-sheet Excel export for the Advance Exam Report page - three sheets
// (Summary, Student Details, Score Distribution), mirroring the on-screen
// report. write-excel-file writes cell data only (no chart objects), so the
// on-screen bar chart isn't reproduced as an image here - the distribution
// sheet is data-only.
import writeXlsxFile from 'write-excel-file/browser';
import type { ExamResponse } from '../types/exam';
import type { ExamResultScheme } from './examResultScheme';
import type { AdvanceReportData } from './advanceExamReport';

const HEADER_STYLE = { fontWeight: 'bold' as const, backgroundColor: '#1f6f4a', textColor: '#ffffff' };
const SECTION_STYLE = { fontWeight: 'bold' as const, backgroundColor: '#dff3e7' };
const LABEL_STYLE = { fontWeight: 'bold' as const };

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

export async function exportAdvanceExamReportExcel(
  exam: ExamResponse,
  scheme: ExamResultScheme,
  report: AdvanceReportData,
): Promise<void> {
  const passPct = exam.totalMarks > 0 ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 0;

  const summarySheet = [
    [{ value: 'Exam Report Summary', ...SECTION_STYLE, columnSpan: 4 }],
    [{ value: 'Exam Name', ...LABEL_STYLE }, exam.title, { value: 'Exam Type', ...LABEL_STYLE }, exam.examTypeName ?? '—'],
    [
      { value: 'Exam Date', ...LABEL_STYLE },
      exam.startAtUtc ? new Date(exam.startAtUtc).toLocaleString() : '—',
      { value: 'Duration', ...LABEL_STYLE },
      `${exam.durationMinutes} Minutes`,
    ],
    [
      { value: 'Total Marks', ...LABEL_STYLE },
      exam.totalMarks,
      { value: scheme.passingLabel, ...LABEL_STYLE },
      `${exam.passingMarks} (${passPct}%)`,
    ],
    [],
    [{ value: 'Summary', ...LABEL_STYLE }, { value: 'Count', ...LABEL_STYLE }, { value: 'Percentage', ...LABEL_STYLE }],
    ['Total Candidates', report.totalCandidates, '100%'],
    ['Present', report.presentCount, `${pct(report.presentCount, report.totalCandidates)}%`],
    ['Absent', report.absentCount, `${pct(report.absentCount, report.totalCandidates)}%`],
    ...(scheme.hasPassFailConcept
      ? [
          [scheme.outcomeLabels.pass, report.passCount, `${pct(report.passCount, report.presentCount)}%`],
          [
            scheme.outcomeLabels.fail,
            report.presentCount - report.passCount,
            `${pct(report.presentCount - report.passCount, report.presentCount)}%`,
          ],
        ]
      : []),
    [],
    [{ value: 'Score Highlights', ...SECTION_STYLE, columnSpan: 2 }],
    ['Average Score', `${report.averagePercentage}%`],
    ['Highest Score', report.highest ? `${round1(report.highest.percent)}% (${report.highest.student.fullName})` : '—'],
    ['Lowest Score', report.lowest ? `${round1(report.lowest.percent)}% (${report.lowest.student.fullName})` : '—'],
  ];

  const studentHeaderLabels = [
    'Roll Number',
    'Student Name',
    'Status',
    'Score (Obtained)',
    'Total Marks',
    'Percentage',
    'Result',
    ...(scheme.showRankPercentile ? ['Rank', 'Percentile'] : []),
    'Submitted On',
  ];

  const studentDetailSheet = [
    studentHeaderLabels.map((label) => ({ value: label, ...HEADER_STYLE })),
    ...report.studentRows.map((r) => [
      r.student.rollNumber ?? '—',
      r.student.fullName,
      'Present',
      r.attempt.totalScore,
      r.attempt.totalMarks,
      `${round1(r.percent)}%`,
      scheme.hasPassFailConcept ? (r.attempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail) : 'Performance only',
      ...(scheme.showRankPercentile ? [r.rank ?? '—', r.percentile !== null ? `${r.percentile}%` : '—'] : []),
      new Date(r.attempt.submittedAtUtc).toLocaleString(),
    ]),
    ...report.absentStudents.map((s) => [
      s.rollNumber ?? '—',
      s.fullName,
      'Absent',
      '—',
      '—',
      '—',
      'Absent',
      ...(scheme.showRankPercentile ? ['—', '—'] : []),
      '—',
    ]),
  ];

  const distributionSheet = [
    [
      { value: 'Score Range (%)', ...HEADER_STYLE },
      { value: 'No. of Students', ...HEADER_STYLE },
      { value: 'Percentage', ...HEADER_STYLE },
    ],
    ...report.distribution.map((b) => [b.label, b.count, `${pct(b.count, report.presentCount)}%`]),
    [
      { value: 'Total', ...LABEL_STYLE },
      { value: report.presentCount, ...LABEL_STYLE },
      { value: `${pct(report.presentCount, report.totalCandidates)}%`, ...LABEL_STYLE },
    ],
  ];

  await writeXlsxFile([
    { sheet: 'Summary', data: summarySheet },
    { sheet: 'Student Details', data: studentDetailSheet },
    { sheet: 'Score Distribution', data: distributionSheet },
  ]).toFile(`${sanitizeFilename(exam.title)}-advanced-report.xlsx`);
}
