import { useQuery } from '@tanstack/react-query';
import { getMyAttempt, getUserAttempts } from '../api/submissionApi';

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
