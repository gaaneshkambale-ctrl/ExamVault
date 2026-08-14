import { useQuery } from '@tanstack/react-query';
import { getUser, getUserSessions, listUsers } from '../api/userApi';

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}

export function useUserSessions(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['users', id, 'sessions'],
    queryFn: () => getUserSessions(id!),
    enabled: !!id && enabled,
  });
}
