import { useMemo } from 'react';
import { useExams } from './useExams';
import { useAssignments } from './useAssignments';
import { useAttemptsByExam } from './useSubmissions';
import { attemptViolationCount } from '../utils/proctoring';
import type { ExamResponse } from '../types/exam';
import type { ExamAttemptResponse } from '../types/submission';

// Shared by Active Exams (Live Monitoring) and the Exam Scheduled page's own
// "Live Exams (Currently Running)" panel - both need the exact same
// definition of "currently live" (a Published exam with at least one
// InProgress attempt right now), not two copies that could quietly drift.
const POLL_INTERVAL_MS = 15000;
const ENDING_SOON_WINDOW_MS = 30 * 60 * 1000;

export type ActiveExamStatus = 'InProgress' | 'EndingSoon' | 'NeedsReview';

export interface ActiveExamCard {
  exam: ExamResponse;
  status: ActiveExamStatus;
  inProgress: ExamAttemptResponse[];
  completedCount: number;
  totalAssigned: number;
  startAtUtc: string | null;
  endAtUtc: string | null;
}

export function useActiveExamCards() {
  const { data: exams, isLoading: isLoadingExams, isError: isExamsError } = useExams();
  const { data: assignments } = useAssignments();

  const publishedExamIds = useMemo(
    () => (exams ?? []).filter((exam) => exam.status === 'Published').map((exam) => exam.id),
    [exams],
  );
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(publishedExamIds, POLL_INTERVAL_MS);

  // Assignments are the source of truth for "how many students are expected
  // to take this exam" - an exam can have more than one assignment (separate
  // batches/windows), so this sums targetCount across all of them.
  const assignedCountByExam = useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of assignments ?? []) {
      map.set(assignment.examId, (map.get(assignment.examId) ?? 0) + assignment.targetCount);
    }
    return map;
  }, [assignments]);

  // Time Started/Expected End: an exam's own startAtUtc/endAtUtc are often
  // never set (StartAttemptHandler only falls back to them when a student
  // has no assignment at all) - the real window students are testing under
  // lives on their assignment(s). When an exam has more than one assignment
  // (separate batches with different windows), use the one with the
  // soonest deadline - the next thing an admin needs to know about, not the
  // furthest-out one (which would hide an imminent "Ending Soon" behind a
  // cohort that still has days left).
  const windowByExam = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    for (const assignment of assignments ?? []) {
      const existing = map.get(assignment.examId);
      if (!existing || new Date(assignment.endAtUtc) < new Date(existing.end)) {
        map.set(assignment.examId, { start: assignment.startAtUtc, end: assignment.endAtUtc });
      }
    }
    return map;
  }, [assignments]);

  const now = Date.now();
  const cards: ActiveExamCard[] = (exams ?? [])
    .filter((exam) => exam.status === 'Published')
    .map((exam) => {
      const attempts = attemptsByExam[exam.id] ?? [];
      const inProgress = attempts.filter((a) => a.status === 'InProgress');
      const completedCount = attempts.filter(
        (a) => a.status === 'Submitted' || a.status === 'AutoSubmitted',
      ).length;
      const totalAssigned = assignedCountByExam.get(exam.id) ?? attempts.length;
      const window = windowByExam.get(exam.id);
      const startAtUtc = window?.start ?? exam.startAtUtc;
      const endAtUtc = window?.end ?? exam.endAtUtc;

      const endAtMs = endAtUtc ? new Date(endAtUtc).getTime() : null;
      const isEndingSoon = endAtMs !== null && endAtMs - now > 0 && endAtMs - now <= ENDING_SOON_WINDOW_MS;
      const needsReview = inProgress.some((a) => attemptViolationCount(a) > 0);
      const status: ActiveExamStatus = isEndingSoon ? 'EndingSoon' : needsReview ? 'NeedsReview' : 'InProgress';

      return { exam, status, inProgress, completedCount, totalAssigned, startAtUtc, endAtUtc };
    })
    // "Active" = actually has a live attempt right now, not just Published status.
    .filter((card) => card.inProgress.length > 0);

  return {
    cards,
    isLoading: isLoadingExams || isLoadingAttempts,
    isError: isExamsError,
  };
}
