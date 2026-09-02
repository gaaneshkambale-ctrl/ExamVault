import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getMyResult } from '../api/resultApi';

// A 403 here means "Results - View" was revoked for this role, not a
// transient failure, so retrying it is pointless - it just leaves the page
// spinning for several retries before settling into the error state.
function retryUnlessClientError(failureCount: number, error: unknown) {
  if (isAxiosError(error) && (error.response?.status ?? 0) >= 400 && (error.response?.status ?? 0) < 500) {
    return false;
  }
  return failureCount < 3;
}

export function useMyResult(examId: string | undefined) {
  return useQuery({
    queryKey: ['results', 'mine', examId],
    queryFn: () => getMyResult(examId!),
    enabled: !!examId,
    retry: retryUnlessClientError,
  });
}
