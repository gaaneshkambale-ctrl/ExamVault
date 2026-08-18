import { useQuery } from '@tanstack/react-query';
import { getProctoringSettings } from '../api/examApi';

export function useProctoringSettings(enabled = true) {
  return useQuery({
    queryKey: ['proctoring-settings'],
    queryFn: getProctoringSettings,
    enabled,
  });
}
