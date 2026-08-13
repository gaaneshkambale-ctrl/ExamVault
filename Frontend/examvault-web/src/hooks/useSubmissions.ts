import { useQuery } from '@tanstack/react-query';
import { getMyAttempt } from '../api/submissionApi';

export function useMyAttempt(examId: string | undefined) {
  return useQuery({
    queryKey: ['submissions', 'mine', examId],
    queryFn: () => getMyAttempt(examId!),
    enabled: !!examId,
  });
}
