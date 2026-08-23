import apiClient from './axiosClient';
import type { CreateTenantAdminRequest, CreateTenantRequest, Tenant } from '../types/tenant';

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
