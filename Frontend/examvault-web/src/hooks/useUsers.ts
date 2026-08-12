import { useQuery } from '@tanstack/react-query';
import { getUser, listUsers } from '../api/userApi';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}
