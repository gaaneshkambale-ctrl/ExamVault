// Exam-level performance summary rows for the Performance Reports export
// (PerformanceReports.tsx) - kept separate from that page's own on-screen
// `performanceByExam` memo (unchanged by this) the same way examSummary.ts's
// buildExamSummaries is kept separate from AdminReports.tsx's on-screen
// perExamStats. Reuses buildExamSummaries for the population/context columns
// (Total Candidates/Submitted/Not Submitted/Passed/Failed/the % metrics) -
// the same authoritative computeExamAttendance()-based numbers already used
// by Exam Result, Result Analytics and Exam Reports - and adds only the one
// metric that's specific to this page: Improvement %.
import { buildExamSummaries, percentOf, type ExamSummaryRow } from './examSummary';
import { computeDelta, type DeltaResult } from './dateRange';
import type { AdminAttemptResultResponse } from '../types/result';
import type { ExamResponse } from '../types/exam';

export interface PerformanceSummaryRow extends ExamSummaryRow {
  /**
   * Same "vs prior period" trend already shown on screen (the page's
   * "Improvement" KPI card and table column) - this exam's current-period
   * average % vs. its average % in the immediately-preceding period of
   * equal length (see dateRange.ts's getPriorPeriod/computeDelta - the same
   * comparison every other KPI delta on this page already uses, not a new
   * formula). `percent: null` means this exam has zero results in the
   * prior window at all, ie. there is no real baseline to compare against
   * (the on-screen card/table already render this as "New" rather than a
   * number) - callers must NOT coerce this to 0, since a real 0% baseline
   * and "no baseline" are different things and only the former is a
   * meaningful improvement figure.
   */
  improvement: DeltaResult;
}

export function buildPerformanceSummaries(
  filteredResults: AdminAttemptResultResponse[],
  allResults: AdminAttemptResultResponse[],
  priorResults: AdminAttemptResultResponse[],
  exams: ExamResponse[],
  eligibleStudents: { id: string }[],
): PerformanceSummaryRow[] {
  const base = buildExamSummaries(filteredResults, allResults, exams, eligibleStudents);

  const currentByExam = new Map<string, AdminAttemptResultResponse[]>();
  for (const r of filteredResults) {
    const list = currentByExam.get(r.examId) ?? [];
    list.push(r);
    currentByExam.set(r.examId, list);
  }
  const priorByExam = new Map<string, AdminAttemptResultResponse[]>();
  for (const r of priorResults) {
    const list = priorByExam.get(r.examId) ?? [];
    list.push(r);
    priorByExam.set(r.examId, list);
  }

  const avgOf = (rows: AdminAttemptResultResponse[]): number => {
    if (rows.length === 0) return 0;
    const pcts = rows.map(percentOf);
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
  };

  return base.map((row) => ({
    ...row,
    improvement: computeDelta(avgOf(currentByExam.get(row.examId) ?? []), avgOf(priorByExam.get(row.examId) ?? [])),
  }));
}
