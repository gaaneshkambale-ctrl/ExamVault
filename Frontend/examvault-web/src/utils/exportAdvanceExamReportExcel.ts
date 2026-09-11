// Multi-sheet Excel export for the Advance Exam Report page - kept in step
// with exportAdvanceExamReportPdf.ts's content (Exam Info fields, KPI
// breakdown, Section-wise Performance, Question Analysis) via the same
// AdvanceReportExtras data, so the two exports never drift apart. Unlike the
// PDF, absent students are never capped here - a spreadsheet has no page
// limit, so there's no reason to summarize away real roster data.
import writeXlsxFile from 'write-excel-file/browser';
import type { ExamResponse } from '../types/exam';
import type { ExamResultScheme } from './examResultScheme';
import type { AdvanceReportData } from './advanceExamReport';
import type { AdvanceReportExtras } from './advanceExamReportAnalysis';
import type { MyTenant } from '../types/tenant';

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

function formatAddress(org: MyTenant | undefined): string {
  if (!org) return '';
  return [org.addressLine1, org.addressLine2, org.city, org.state, org.postalCode, org.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');
}

export async function exportAdvanceExamReportExcel(
  exam: ExamResponse,
  scheme: ExamResultScheme,
  report: AdvanceReportData,
  extras: AdvanceReportExtras,
): Promise<void> {
  const passPct = exam.totalMarks > 0 ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 0;
  const startDate = exam.startAtUtc ? new Date(exam.startAtUtc) : null;
  const endDate = exam.endAtUtc ? new Date(exam.endAtUtc) : null;
  const avgScoreMarks =
    report.studentRows.length === 0
      ? 0
      : round1(report.studentRows.reduce((sum, r) => sum + r.attempt.totalScore, 0) / report.studentRows.length);

  const orgAddress = formatAddress(extras.organization);

  const summarySheet = [
    [{ value: 'Exam Report Summary', ...SECTION_STYLE, columnSpan: 4 }],
    ...(extras.organization?.name
      ? [[{ value: 'Organization', ...LABEL_STYLE }, extras.organization.name, { value: 'Address', ...LABEL_STYLE }, orgAddress || '—']]
      : []),
    [{ value: 'Exam Title', ...LABEL_STYLE }, exam.title, { value: 'Exam Code', ...LABEL_STYLE }, exam.examCode ?? '—'],
    [{ value: 'Exam Type', ...LABEL_STYLE }, exam.examTypeName ?? '—', { value: 'Status', ...LABEL_STYLE }, exam.status],
    [
      { value: 'Exam Date', ...LABEL_STYLE },
      startDate ? startDate.toLocaleDateString() : '—',
      { value: 'Mode', ...LABEL_STYLE },
      'Online Exam',
    ],
    [
      { value: 'Start Time', ...LABEL_STYLE },
      startDate ? startDate.toLocaleTimeString() : '—',
      { value: 'End Time', ...LABEL_STYLE },
      endDate ? endDate.toLocaleTimeString() : '—',
    ],
    [
      { value: 'Duration', ...LABEL_STYLE },
      `${exam.durationMinutes} Minutes`,
      { value: 'Academic Year', ...LABEL_STYLE },
      startDate ? String(startDate.getFullYear()) : '—',
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
    ['Attempted (Present)', report.presentCount, `${pct(report.presentCount, report.totalCandidates)}%`],
    ['Absent', report.absentCount, `${pct(report.absentCount, report.totalCandidates)}%`],
    ...(scheme.hasPassFailConcept
      ? [
          [scheme.outcomeLabels.pass, report.passCount, `${pct(report.passCount, report.presentCount)}%`],
          [
            scheme.outcomeLabels.fail,
            report.presentCount - report.passCount,
            `${pct(report.presentCount - report.passCount, report.presentCount)}%`,
          ],
          ['Pass Rate', '', `${report.passRate}%`],
        ]
      : []),
    [],
    [{ value: 'Score Highlights', ...SECTION_STYLE, columnSpan: 3 }],
    [{ value: '', ...LABEL_STYLE }, { value: 'Score (Marks)', ...LABEL_STYLE }, { value: 'Percentage', ...LABEL_STYLE }],
    [
      'Highest',
      report.highest ? `${report.highest.attempt.totalScore} / ${report.highest.attempt.totalMarks}` : '—',
      report.highest ? `${round1(report.highest.percent)}%` : '—',
    ],
    [
      'Lowest',
      report.lowest ? `${report.lowest.attempt.totalScore} / ${report.lowest.attempt.totalMarks}` : '—',
      report.lowest ? `${round1(report.lowest.percent)}%` : '—',
    ],
    ['Average', report.studentRows.length > 0 ? `${avgScoreMarks} / ${exam.totalMarks}` : '—', `${report.averagePercentage}%`],
    [
      'Most Common Range',
      '',
      report.mostCommonBucket && report.mostCommonBucket.count > 0
        ? `${report.mostCommonBucket.label} (${report.mostCommonBucket.count} student(s))`
        : '—',
    ],
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
    // Every absent student, unlike the PDF's capped list - a spreadsheet has
    // no page budget to protect, so there's no reason to summarize this away.
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

  const sectionSheet = [
    [
      { value: 'Section / Topic', ...HEADER_STYLE },
      { value: 'Total Questions', ...HEADER_STYLE },
      { value: 'Avg Score (Marks)', ...HEADER_STYLE },
      { value: 'Accuracy', ...HEADER_STYLE },
    ],
    ...extras.sectionStats.map((s) => [s.sectionName, s.totalQuestions, s.avgScore, `${s.accuracy}%`]),
  ];

  const questionSheet = [
    [
      { value: 'Question', ...HEADER_STYLE },
      { value: 'Correct', ...HEADER_STYLE },
      { value: 'Attempts', ...HEADER_STYLE },
      { value: '% Correct', ...HEADER_STYLE },
    ],
    // Hardest first, same order the PDF's "Most Difficult Questions" panel
    // shows (buildQuestionDifficulty already sorts ascending by %correct) -
    // the full list, not just the PDF's top-5 slice.
    ...extras.questionDifficulty.map((q) => [q.questionText, q.correct, q.attempts, `${q.percentCorrect}%`]),
  ];

  const sheets = [
    { sheet: 'Summary', data: summarySheet },
    { sheet: 'Student Details', data: studentDetailSheet },
    { sheet: 'Score Distribution', data: distributionSheet },
    ...(extras.sectionStats.length > 0 ? [{ sheet: 'Section-wise Performance', data: sectionSheet }] : []),
    ...(extras.questionDifficulty.length > 0 ? [{ sheet: 'Question Analysis', data: questionSheet }] : []),
  ];

  await writeXlsxFile(sheets).toFile(`${sanitizeFilename(exam.title)}-advanced-report.xlsx`);
}
