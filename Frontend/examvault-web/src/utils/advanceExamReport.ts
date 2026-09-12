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
export function buildAdvanceExamReport(
  attempts: AdminAttemptResultResponse[],
  users: UserListItem[],
  scheme: ExamResultScheme,
): AdvanceReportData {
  const students = users.filter((u) => u.role === 'Student' && u.isActive);

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
