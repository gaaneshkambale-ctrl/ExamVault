import apiClient from './axiosClient';
import type { CreateTenantAdminRequest, CreateTenantRequest, Tenant, UpdateTenantRequest } from '../types/tenant';
import type { RolePermissionsEntry } from '../types/user';

export async function listTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<Tenant[]>('/api/tenants');
  return data;
}

export async function createTenant(request: CreateTenantRequest): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>('/api/tenants', request);
  return data;
}

export async function createTenantAdmin(tenantId: string, request: CreateTenantAdminRequest): Promise<void> {
  await apiClient.post(`/api/tenants/${tenantId}/admins`, request);
}

export async function deactivateTenant(tenantId: string): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>(`/api/tenants/${tenantId}/deactivate`);
  return data;
}

export async function reactivateTenant(tenantId: string): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>(`/api/tenants/${tenantId}/reactivate`);
  return data;
}

export async function updateTenant(tenantId: string, request: UpdateTenantRequest): Promise<Tenant> {
  const { data } = await apiClient.put<Tenant>(`/api/tenants/${tenantId}`, request);
  return data;
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await apiClient.delete(`/api/tenants/${tenantId}`);
}

export async function resetTenantAdminPassword(tenantId: string, adminUserId: string): Promise<string> {
  const { data } = await apiClient.post<{ temporaryPassword: string }>(
    `/api/tenants/${tenantId}/admins/${adminUserId}/reset-password`,
  );
  return data.temporaryPassword;
}

export async function setTenantTrial(tenantId: string, isTrial: boolean, trialEndsAtUtc?: string | null): Promise<Tenant> {
  const { data } = await apiClient.put<Tenant>(`/api/tenants/${tenantId}/trial`, { isTrial, trialEndsAtUtc });
  return data;
}

export async function getTenantRolePermissions(tenantId: string, role: string): Promise<RolePermissionsEntry> {
  const { data } = await apiClient.get<RolePermissionsEntry>(
    `/api/tenants/${tenantId}/roles/${role}/permissions`,
  );
  return data;
}

export async function updateTenantRolePermissions(
  tenantId: string,
  role: string,
  permissions: string[],
): Promise<RolePermissionsEntry> {
  const { data } = await apiClient.put<RolePermissionsEntry>(
    `/api/tenants/${tenantId}/roles/${role}/permissions`,
    { permissions },
  );
  return data;
}
