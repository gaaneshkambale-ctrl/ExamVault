import apiClient from './axiosClient';
import type { OrganizationSettings, UpdateOrganizationSettingsRequest } from '../types/organizationSettings';

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const { data } = await apiClient.get<OrganizationSettings>('/api/tenants/mine/settings');
  return data;
}

// Same shape as getOrganizationSettings, but from the "branding" endpoint,
// which any authenticated tenant member can call (not just Admin/SuperAdmin)
// - used by PDF generation, since a student downloading their own result
// needs the tenant's logo/motto/colors too, not just an Admin editing them.
export async function getOrganizationBranding(): Promise<OrganizationSettings> {
  const { data } = await apiClient.get<OrganizationSettings>('/api/tenants/mine/branding');
  return data;
}

export async function updateOrganizationSettings(
  request: UpdateOrganizationSettingsRequest,
): Promise<OrganizationSettings> {
  const { data } = await apiClient.put<OrganizationSettings>('/api/tenants/mine/settings', request);
  return data;
}

type OrganizationAsset = 'logo' | 'favicon' | 'signature';

export async function uploadOrganizationAsset(asset: OrganizationAsset, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiClient.post(`/api/tenants/mine/${asset}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function removeOrganizationAsset(asset: OrganizationAsset): Promise<void> {
  await apiClient.delete(`/api/tenants/mine/${asset}`);
}

// The asset endpoints require the Bearer token, so a plain <img src> can't
// hit them directly - fetch the bytes through the authenticated client and
// hand back an object URL the caller can point an <img> at (and must revoke
// with URL.revokeObjectURL when done), same pattern as fetchMyPhotoObjectUrl.
export async function fetchOrganizationAssetObjectUrl(asset: OrganizationAsset): Promise<string | null> {
  try {
    const { data } = await apiClient.get<Blob>(`/api/tenants/mine/${asset}`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}
