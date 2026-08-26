import { useQuery } from '@tanstack/react-query';
import { getGroup, listGroups } from '../api/groupApi';

export function useGroups(enabled = true) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: listGroups,
    enabled,
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  });
}
