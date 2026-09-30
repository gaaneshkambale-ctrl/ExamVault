import apiClient from './axiosClient';
import type { CreateOrganizationTypeRequest, OrganizationType, UpdateOrganizationTypeRequest } from '../types/organizationType';

// Active-only list, for the "Institution Type" dropdown - any authenticated
// user can call this (Admin editing Organization Settings, or a Super Admin
// filling in Create Organization).
export async function listOrganizationTypes(): Promise<OrganizationType[]> {
  const { data } = await apiClient.get<OrganizationType[]>('/api/organization-types');
  return data;
}

// Super Admin's own management screen - includes deactivated rows too.
export async function listAllOrganizationTypes(): Promise<OrganizationType[]> {
  const { data } = await apiClient.get<OrganizationType[]>('/api/organization-types/all');
  return data;
}

export async function createOrganizationType(request: CreateOrganizationTypeRequest): Promise<OrganizationType> {
  const { data } = await apiClient.post<OrganizationType>('/api/organization-types', request);
  return data;
}

export async function updateOrganizationType(id: string, request: UpdateOrganizationTypeRequest): Promise<OrganizationType> {
  const { data } = await apiClient.put<OrganizationType>(`/api/organization-types/${id}`, request);
  return data;
}

export async function deleteOrganizationType(id: string): Promise<void> {
  await apiClient.delete(`/api/organization-types/${id}`);
}
