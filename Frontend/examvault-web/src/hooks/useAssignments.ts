import { useQuery } from '@tanstack/react-query';
import { getAssignment, getMyAssignmentForExam, listAllAssignments } from '../api/assignmentApi';

export function useAssignments(enabled = true) {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: listAllAssignments,
    enabled,
  });
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
