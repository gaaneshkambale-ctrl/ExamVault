// Shared data-shaping for the Advance Exam Report page and its Excel export,
// so the two never compute different numbers from the same inputs.
import { computePercentile, computeRank, type ExamResultScheme } from './examResultScheme';
import type { AdminAttemptResultResponse } from '../types/result';
import type { UserListItem } from '../types/user';

export interface AdvanceReportStudentRow {
  student: UserListItem;
  attempt: AdminAttemptResultResponse;
  percent: number;
  rank: number | null;
  percentile: number | null;
}

export interface DistributionBucket {
  label: string;
  count: number;
}

export interface AdvanceReportData {
  totalCandidates: number;
  presentCount: number;
  absentCount: number;
  absentStudents: UserListItem[];
  studentRows: AdvanceReportStudentRow[];
  averagePercentage: number;
  highest: AdvanceReportStudentRow | null;
  lowest: AdvanceReportStudentRow | null;
  passCount: number;
  passRate: number;
  distribution: DistributionBucket[];
  mostCommonBucket: DistributionBucket | null;
}

export const DISTRIBUTION_BUCKETS = [
  { label: '0-20%', min: 0, max: 20 },
  { label: '21-40%', min: 20, max: 40 },
  { label: '41-60%', min: 40, max: 60 },
  { label: '61-80%', min: 60, max: 80 },
  { label: '81-100%', min: 80, max: 101 },
];

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

// Eligibility = every active Student in the tenant, since this codebase has
// no per-exam assignment/audience concept to diff attempts against instead.
function isEligibleStudent(u: UserListItem): boolean {
  return u.role === 'Student' && u.isActive;
}

export interface ExamAttendance {
  totalCandidates: number;
  /**
   * Unique candidates with at least one SUBMITTED/auto-submitted attempt.
   * Renamed from `attemptedCount` - "Attempted" implied a start/finish
   * lifecycle (started vs. finished) this data doesn't actually have. The
   * Result Service's reporting endpoint (see this function's own doc
   * comment) only ever returns Submitted/AutoSubmitted attempts - a
   * candidate who opened the exam and never submitted (or is still
   * mid-attempt) is invisible to this whole computation, not counted as
   * "not submitted" either. So `submittedCount` claims only what the data
   * actually shows: this many candidates have at least one submitted
   * result. It does NOT claim they "started" (that's a stronger claim this
   * data can't support).
   */
  submittedCount: number;
  /** Eligible candidates with NO submitted attempt - the complement of submittedCount within totalCandidates. Renamed from `absentCount` for the same reason. */
  notSubmittedCount: number;
}

/**
 * Just the submission-attendance counts (not the full score/rank/
 * distribution analytics below) - the one authoritative place this app
 * computes "who has submitted this exam", used by the Exam Result roster
 * (generateResultPdf.ts's drawExamResultRoster, via ExamResults.tsx) and
 * the Result Analytics export (ResultAnalytics.tsx, via buildExamSummaries
 * in examSummary.ts) so neither has to (or can accidentally) recompute its
 * own version of "Total Candidates"/"Submitted"/"Not Submitted" and drift
 * from Detailed Exam Report's totalCandidates/presentCount/absentCount,
 * which use this same "diff attempts against the eligible roster" idea
 * (just also carrying the rank/percentile/distribution analytics those two
 * lighter-weight consumers don't show, and its own pre-existing
 * presentCount/absentCount/absentStudents field names, left as-is rather
 * than renamed to match - see exportAdvanceExamReportPdf.ts/
 * exportAdvanceExamReportExcel.ts, which relabel what those fields render
 * as "Submitted"/"Not Submitted" without renaming the fields themselves,
 * to avoid a wider, unrequested refactor of AdvanceExamReport.tsx's own
 * on-screen dashboard, which reads those same field names directly).
 *
 * `submittedCount` is a unique-candidate headcount, not `attempts.length` -
 * GetExamReportHandler.cs (Backend/Services/ResultService) returns one row
 * per ATTEMPT, not per student, so a candidate who retook the exam would
 * otherwise be counted twice. This function does not, and cannot, tell a
 * candidate who never opened the exam apart from one who opened it and
 * never submitted - see this file's SUBMITTED-ONLY REPORTING BOUNDARY note
 * below for why, and why that's being left as-is for now.
 *
 * Takes an already-eligible roster (just `{ id }`) rather than filtering
 * `role`/`isActive` itself like buildAdvanceExamReport's `students` does -
 * ExamResults.tsx/ResultAnalytics.tsx (where Instructors, who have no
 * "Users - View" permission, can land) only ever have the narrower
 * StudentSummary[] from the students-only endpoint, which the backend
 * already scopes to role=Student but does not expose IsActive on at all
 * (see ListStudentsHandler.cs/UsersController.cs's ListStudents). So these
 * two consumers' "Total Candidates" can include an inactive student that
 * Detailed Exam Report's (Admin-only, full UserListItem[]-backed) count
 * would exclude - a real, pre-existing gap in what data this permission
 * level can see, not something to fake around.
 */
export function computeExamAttendance(attempts: AdminAttemptResultResponse[], eligibleStudents: { id: string }[]): ExamAttendance {
  const submittedIds = new Set(attempts.map((a) => a.userId));
  const notSubmittedCount = eligibleStudents.filter((s) => !submittedIds.has(s.id)).length;
  return { totalCandidates: eligibleStudents.length, submittedCount: submittedIds.size, notSubmittedCount };
}

// SUBMITTED-ONLY REPORTING BOUNDARY: `attempts` above (and everywhere else
// in this file) only ever contains Submitted/AutoSubmitted attempts -
// ListAttemptsByExamHandler.cs (Backend/Services/SubmissionService) calls
// GetSubmittedAttemptsByExamIdAsync specifically (its own controller
// comment: "Reports - Submitted/AutoSubmitted only", as opposed to the
// separate /by-exam/{id}/live endpoint, which does include InProgress
// attempts, for Live Monitoring's Active Exams screen). So nothing in this
// file - or Exam Result, Detailed Exam Report, or Result Analytics, which
// all read from this same reporting data - can distinguish "candidate
// never opened the exam" from "candidate opened it and never submitted".
// Both look identical: absent from `attempts`. Deliberately not pulling in
// the live/InProgress data source to close that gap in this task - see
// ActionPlan.txt for the explicit decision to leave this reporting
// boundary as-is for now.
//
// RETAKE / PASS-FAIL ATTEMPT-SELECTION RULE: this codebase does NOT have
// one single rule for how a retake (a candidate with more than one
// submitted attempt on the same exam) counts toward Passed/Failed - two
// different, both pre-existing, rules are in use:
//   - buildAdvanceExamReport below (Detailed Exam Report, its Excel
//     export, and the AdvanceExamReport.tsx page) dedupes to ONE row per
//     student - their most recently submitted attempt (`presentBase`'s
//     "last attempt represents the student" convention, already used
//     elsewhere per its own comment) - so passCount/passRate reflect each
//     candidate's latest outcome only.
//   - computeExamResultSummary (generateResultPdf.ts, Exam Result) and
//     buildExamSummaries (examSummary.ts, Result Analytics) do NOT dedupe
//     - every submitted attempt is counted separately, so a candidate who
//     failed once and passed on a retake appears as both one Passed and
//     one Failed across their two attempts.
// This is pre-existing behavior in both cases, not something introduced
// by the Submitted/Not Submitted terminology fix - documented here per
// explicit instruction, not changed (no new retake rule invented, no
// unification of the two attempted in this task).

export function buildAdvanceExamReport(
  attempts: AdminAttemptResultResponse[],
  users: UserListItem[],
  scheme: ExamResultScheme,
): AdvanceReportData {
  const students = users.filter(isEligibleStudent);

  const byStudent = new Map<string, AdminAttemptResultResponse[]>();
  for (const attempt of attempts) {
    const list = byStudent.get(attempt.userId) ?? [];
    list.push(attempt);
    byStudent.set(attempt.userId, list);
  }

  const presentBase = students
    .filter((s) => byStudent.has(s.id))
    .map((student) => {
      const studentAttempts = byStudent.get(student.id)!;
      // One row per student - their most recently submitted attempt, same
      // "last attempt represents the student" convention already used in
      // ExamTypeStudentPerformance.tsx.
      const lastAttempt = studentAttempts.reduce(
        (max, a) => (a.submittedAtUtc > max.submittedAtUtc ? a : max),
        studentAttempts[0],
      );
      return { student, attempt: lastAttempt, percent: percentOf(lastAttempt) };
    });

  const absentStudents = students.filter((s) => !byStudent.has(s.id));

  const cohortScores = presentBase.map((r) => r.percent);
  const studentRows: AdvanceReportStudentRow[] = presentBase
    .map((r) => ({
      ...r,
      rank: scheme.showRankPercentile ? computeRank(cohortScores, r.percent) : null,
      percentile: scheme.showRankPercentile ? computePercentile(cohortScores, r.percent) : null,
    }))
    .sort((a, b) => b.percent - a.percent);

  const presentCount = studentRows.length;
  const averagePercentage =
    presentCount === 0 ? 0 : Math.round((cohortScores.reduce((a, b) => a + b, 0) / presentCount) * 10) / 10;
  const highest = studentRows.length === 0 ? null : studentRows.reduce((max, r) => (r.percent > max.percent ? r : max));
  const lowest = studentRows.length === 0 ? null : studentRows.reduce((min, r) => (r.percent < min.percent ? r : min));
  const passCount = studentRows.filter((r) => r.attempt.passed).length;
  const passRate = presentCount === 0 ? 0 : Math.round((passCount / presentCount) * 100);

  const distribution = DISTRIBUTION_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: cohortScores.filter((p) => p >= bucket.min && p < bucket.max).length,
  }));
  const mostCommonBucket =
    distribution.length === 0 ? null : distribution.reduce((max, b) => (b.count > max.count ? b : max));

  return {
    totalCandidates: students.length,
    presentCount,
    absentCount: absentStudents.length,
    absentStudents,
    studentRows,
    averagePercentage,
    highest,
    lowest,
    passCount,
    passRate,
    distribution,
    mostCommonBucket,
  };
}
