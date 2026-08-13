import { useQuery } from '@tanstack/react-query';
import { getMyResult } from '../api/resultApi';

export function useMyResult(examId: string | undefined) {
  return useQuery({
    queryKey: ['results', 'mine', examId],
    queryFn: () => getMyResult(examId!),
    enabled: !!examId,
  });
}
