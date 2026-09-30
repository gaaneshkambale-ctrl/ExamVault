import { useQuery } from '@tanstack/react-query';
import { getUser, getUserSessions, listStudents, listUsers } from '../api/userApi';

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled,
  });
}

// Instructor-safe alternative to useUsers - backed by GET /api/users/students,
// which needs no "Users - View" permission and returns students only.
export function useStudents(enabled = true) {
  return useQuery({
    queryKey: ['users', 'students'],
    queryFn: listStudents,
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
