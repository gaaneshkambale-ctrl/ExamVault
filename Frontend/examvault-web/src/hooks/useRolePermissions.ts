import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllRolePermissions, updateRolePermissions } from '../api/roleApi';

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: getAllRolePermissions,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      updateRolePermissions(role, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });
}
