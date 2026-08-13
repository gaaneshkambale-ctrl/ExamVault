import { useQuery } from '@tanstack/react-query';
import { getAssignment, listAllAssignments } from '../api/assignmentApi';

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
