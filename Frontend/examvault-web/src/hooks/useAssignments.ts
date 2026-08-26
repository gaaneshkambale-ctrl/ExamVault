import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getAssignment,
  getMyAssignmentForExam,
  listAllAssignments,
  listAssignmentsForExam,
} from '../api/assignmentApi';
import type { ExamAssignmentResponse } from '../types/assignment';

export function useAssignments(enabled = true) {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: listAllAssignments,
    enabled,
  });
}

export function useAssignmentsForExam(examId: string | undefined) {
  return useQuery({
    queryKey: ['assignments', 'byExam', examId],
    queryFn: () => listAssignmentsForExam(examId!),
    enabled: !!examId,
  });
}

// Multi-exam version of useAssignmentsForExam - Proctoring needs each
// exam's full assignment detail (enableProctoring isn't on the lightweight
// listAllAssignments shape) across every exam at once, same aggregation
// pattern as useAttemptsByExam etc.
export function useAssignmentsByExam(examIds: string[] | undefined) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['assignments', 'byExam', examId],
      queryFn: () => listAssignmentsForExam(examId),
    })),
  });

  const assignmentsByExam: Record<string, ExamAssignmentResponse[]> = {};
  ids.forEach((examId, index) => {
    assignmentsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { assignmentsByExam, isLoading };
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: () => getAssignment(id!),
    enabled: !!id,
  });
}

export function useMyAssignmentForExam(examId: string | undefined) {
  return useQuery({
    queryKey: ['assignments', 'mine', examId],
    queryFn: () => getMyAssignmentForExam(examId!),
    enabled: !!examId,
  });
}
