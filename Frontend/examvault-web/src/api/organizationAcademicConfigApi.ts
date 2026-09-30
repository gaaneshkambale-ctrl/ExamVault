import apiClient from './axiosClient';
import type { OrganizationAcademicConfig, UpdateOrganizationAcademicConfigRequest } from '../types/organizationAcademicConfig';

export async function getOrganizationAcademicConfig(): Promise<OrganizationAcademicConfig> {
  const { data } = await apiClient.get<OrganizationAcademicConfig>('/api/tenants/mine/academic-config');
  return data;
}

export async function updateOrganizationAcademicConfig(
  request: UpdateOrganizationAcademicConfigRequest,
): Promise<OrganizationAcademicConfig> {
  const { data } = await apiClient.put<OrganizationAcademicConfig>('/api/tenants/mine/academic-config', request);
  return data;
}
