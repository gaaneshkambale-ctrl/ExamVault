import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getExamAttempts,
  getExamAttemptsWithAnswers,
  getExamViolations,
  getMyAttempt,
  getUserAttempts,
} from '../api/submissionApi';
import type { AttemptWithAnswersResponse, ExamAttemptResponse, ViolationEventResponse } from '../types/submission';

export function useMyAttempt(examId: string | undefined) {
  return useQuery({
    queryKey: ['submissions', 'mine', examId],
    queryFn: () => getMyAttempt(examId!),
    enabled: !!examId,
  });
}

export function useUserAttempts(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['submissions', 'byUser', userId],
    queryFn: () => getUserAttempts(userId!),
    enabled: !!userId && enabled,
  });
}

// Same per-exam aggregation pattern as useQuestionCountsByExam - one useQueries
// call fanning out across every exam id, keyed so Live Monitoring's polling
// refetch (refetchInterval) only refires these, not every other query on the
// page. Returns the raw attempts per exam so the caller derives whatever
// stats it needs (in-progress count, completed count, violation flags, etc).
export function useAttemptsByExam(examIds: string[] | undefined, refetchInterval?: number) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['submissions', 'byExam', examId],
      queryFn: () => getExamAttempts(examId),
      refetchInterval,
    })),
  });

  const attemptsByExam: Record<string, ExamAttemptResponse[]> = {};
  ids.forEach((examId, index) => {
    attemptsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { attemptsByExam, isLoading };
}

// Same aggregation pattern - fans the violations/live endpoint out across
// every exam id for Security Violations' feed.
export function useViolationsByExam(examIds: string[] | undefined, refetchInterval?: number) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['submissions', 'violationsByExam', examId],
      queryFn: () => getExamViolations(examId),
      refetchInterval,
    })),
  });

  const violationsByExam: Record<string, ViolationEventResponse[]> = {};
  ids.forEach((examId, index) => {
    violationsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { violationsByExam, isLoading };
}

// Same shape/purpose as useAttemptsByExam, but keeps each attempt's answers
// array (Student Attempts' progress column needs answered-question counts,
// which the attempt-only version can't give). Separate query key since the
// two hooks cache differently-shaped data for the same underlying endpoint.
export function useAttemptsWithAnswersByExam(examIds: string[] | undefined, refetchInterval?: number) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['submissions', 'byExamWithAnswers', examId],
      queryFn: () => getExamAttemptsWithAnswers(examId),
      refetchInterval,
    })),
  });

  const attemptsByExam: Record<string, AttemptWithAnswersResponse[]> = {};
  ids.forEach((examId, index) => {
    attemptsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { attemptsByExam, isLoading };
}
