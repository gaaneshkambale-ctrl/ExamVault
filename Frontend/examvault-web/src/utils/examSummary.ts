// Exam-level summary rows for the Result Analytics and Exam Reports exports
// (ResultAnalytics.tsx, AdminReports.tsx) - kept separate from
// advanceExamReport.ts's single-exam, deep-analytics AdvanceReportData
// (rank/percentile/distribution/absent-student list) since these are
// deliberately flat, multi-exam SUMMARIES, not per-exam analytics. Pulled
// out of the page components into a pure function so it can be unit-tested
// the same way every other PDF/export data-shaping function in this
// codebase already is.
import { computeExamAttendance } from './advanceExamReport';
import type { AdminAttemptResultResponse } from '../types/result';
import type { ExamResponse } from '../types/exam';

export function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

function earliestSubmission(rows: AdminAttemptResultResponse[]): string | null {
  if (rows.length === 0) return null;
  return rows.reduce((min, r) => (r.submittedAtUtc < min ? r.submittedAtUtc : min), rows[0].submittedAtUtc);
}

export interface ExamSummaryRow {
  examId: string;
  examTitle: string;
  examCode: string | null;
  examType: string | null;
  /** Free-text category tag (EXAM_CATEGORIES) - null only when the exam record itself couldn't be found. */
  category: string | null;
  /** Raw ISO string (exam.startAtUtc) - left unformatted so callers can render it however they need; null when the exam was never scheduled. */
  examDate: string | null;
  /** Eligible/assigned candidates for this exam (see computeExamAttendance). */
  totalCandidates: number;
  /** Unique candidates with at least one SUBMITTED/auto-submitted attempt - NOT "started"/"attempted" in a stronger sense; see computeExamAttendance's own doc comment for why this data can't support that claim. */
  submitted: number;
  /** Eligible candidates with no submitted attempt. */
  notSubmitted: number;
  /** Total submitted/auto-submitted attempt RECORDS in the current filter window, including retakes - can exceed `submitted` if a candidate resubmitted. This is the pre-existing "how much submission activity happened" metric (was labeled "Completed" before this data's real meaning was clarified - not renamed to imply a completed lifecycle either, since this data source can't tell a submitted-once attempt from a submitted-and-graded one). */
  submittedAttempts: number;
  passed: number;
  failed: number;
  passPercent: number;
  averagePercent: number;
  highestPercent: number;
  lowestPercent: number;
}

/**
 * Builds one summary row per exam.
 *
 * By default, only exams with at least one result in `filteredResults` get
 * a row (the population Result Analytics' "Top Performing Exams" widget
 * already scopes itself to, so its export matches what's on screen).
 * Pass `includeExamsWithNoSubmissions: true` (Exam Reports' "Exam Summary"
 * table already lists every exam matching its category/creation-method
 * filters, zero-submission ones included, showing 0s rather than omitting
 * the row - its export needs the same population) to instead emit one row
 * per exam in `exams`, defaulting every count to 0/empty for an exam with
 * no filtered results. This only changes which exam IDs get a row, not how
 * any individual row is computed - both callers still get Total
 * Candidates/Submitted/Not Submitted from the same computeExamAttendance()
 * call, and the same Passed/Failed-per-submitted-attempt rule.
 *
 * Two different result sets feed each row, deliberately:
 * - `filteredResults` (scoped to the dashboard's current filters) drives
 *   Submitted Attempts/Passed/Failed/Pass %/Average %/Highest %/Lowest % -
 *   genuinely about "what happened in the selected window", the whole
 *   point of those filters. Passed/Failed count every submitted attempt
 *   separately (no per-candidate dedup for retakes) - same rule Exam
 *   Result uses, a different pre-existing rule than Detailed Exam Report's
 *   (see advanceExamReport.ts's RETAKE / PASS-FAIL ATTEMPT-SELECTION RULE
 *   note - documented, not changed, in this task).
 * - `allResults` (unfiltered) drives Total Candidates/Submitted/Not
 *   Submitted via computeExamAttendance() - attendance is a structural
 *   fact about the exam, not a date-stamped event, so a candidate whose
 *   attempt happens to fall outside the selected window must still count
 *   as submitted, not be miscounted as not-submitted just because the
 *   dashboard's date range excluded their timestamp. This is also what
 *   makes these three numbers match Exam Result's own "Total Candidates"/
 *   "Submitted"/"Not Submitted" for the same exam - both call the same
 *   computeExamAttendance().
 */
export function buildExamSummaries(
  filteredResults: AdminAttemptResultResponse[],
  allResults: AdminAttemptResultResponse[],
  exams: ExamResponse[],
  eligibleStudents: { id: string }[],
  options: { includeExamsWithNoSubmissions?: boolean } = {},
): ExamSummaryRow[] {
  const examById = new Map(exams.map((e) => [e.id, e]));

  const filteredByExam = new Map<string, AdminAttemptResultResponse[]>();
  for (const r of filteredResults) {
    const list = filteredByExam.get(r.examId) ?? [];
    list.push(r);
    filteredByExam.set(r.examId, list);
  }

  const allByExam = new Map<string, AdminAttemptResultResponse[]>();
  for (const r of allResults) {
    const list = allByExam.get(r.examId) ?? [];
    list.push(r);
    allByExam.set(r.examId, list);
  }

  const examIds = options.includeExamsWithNoSubmissions ? exams.map((e) => e.id) : Array.from(filteredByExam.keys());

  return examIds.map((examId) => {
    const rows = filteredByExam.get(examId) ?? [];
    const exam = examById.get(examId);
    const pcts = rows.map(percentOf);
    const passedCount = rows.filter((r) => r.passed).length;
    const allRowsForExam = allByExam.get(examId) ?? [];
    const attendance = computeExamAttendance(allRowsForExam, eligibleStudents);

    return {
      examId,
      examTitle: exam?.title ?? 'Unknown exam',
      examCode: exam?.examCode ?? null,
      examType: exam?.examTypeName ?? null,
      category: exam?.category ?? null,
      // exam.startAtUtc is frequently null - this app enforces scheduling
      // per-assignment, not per-exam (see AdvanceExamReport.tsx's own
      // effectiveExam fallback, which pulls the earliest assignment window
      // instead). Rather than fetching assignment data here too, this
      // reuses the same lighter fallback Exam Result's own "Exam Date"
      // already uses (drawExamResultRoster in generateResultPdf.ts) - the
      // earliest real submission for this exam, from the full (unfiltered)
      // attempt history so it doesn't shift with the dashboard's date
      // filter.
      examDate: exam?.startAtUtc ?? earliestSubmission(allRowsForExam),
      totalCandidates: attendance.totalCandidates,
      submitted: attendance.submittedCount,
      notSubmitted: attendance.notSubmittedCount,
      submittedAttempts: rows.length,
      passed: passedCount,
      failed: rows.length - passedCount,
      passPercent: rows.length === 0 ? 0 : Math.round((passedCount / rows.length) * 100),
      averagePercent: pcts.length === 0 ? 0 : Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      highestPercent: pcts.length === 0 ? 0 : Math.round(Math.max(...pcts)),
      lowestPercent: pcts.length === 0 ? 0 : Math.round(Math.min(...pcts)),
    };
  });
}
