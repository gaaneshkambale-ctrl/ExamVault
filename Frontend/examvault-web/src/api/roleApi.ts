import apiClient from './axiosClient';
import type { RolePermissionsEntry } from '../types/user';

export async function getAllRolePermissions(): Promise<RolePermissionsEntry[]> {
  const { data } = await apiClient.get<RolePermissionsEntry[]>('/api/users/roles/permissions');
  return data;
}

export async function updateRolePermissions(
  role: string,
  permissions: string[],
): Promise<RolePermissionsEntry> {
  const { data } = await apiClient.put<RolePermissionsEntry>(
    `/api/users/roles/${encodeURIComponent(role)}/permissions`,
    { permissions },
  );
  return data;
}
