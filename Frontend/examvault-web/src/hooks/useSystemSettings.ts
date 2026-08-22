import { useQuery } from '@tanstack/react-query';
import { getSystemSettings } from '../api/systemSettingsApi';

export function useSystemSettings() {
  return useQuery({
    queryKey: ['settings', 'system'],
    queryFn: getSystemSettings,
  });
}
