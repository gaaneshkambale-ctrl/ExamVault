import apiClient from './axiosClient';
import type { SystemSettingsResponse, UpdateSystemSettingsRequest } from '../types/systemSettings';

export async function getSystemSettings(): Promise<SystemSettingsResponse> {
  const { data } = await apiClient.get<SystemSettingsResponse>('/api/system-settings');
  return data;
}

export async function updateSystemSettings(request: UpdateSystemSettingsRequest): Promise<SystemSettingsResponse> {
  const { data } = await apiClient.put<SystemSettingsResponse>('/api/system-settings', request);
  return data;
}
