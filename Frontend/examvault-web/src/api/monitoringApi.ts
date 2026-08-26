import apiClient from './axiosClient';
import type { ServiceStatusEntry, SystemHealthResponse } from '../types/monitoring';

export async function listServiceStatus(): Promise<ServiceStatusEntry[]> {
  const { data } = await apiClient.get<ServiceStatusEntry[]>('/api/monitoring/services');
  return data;
}

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  const { data } = await apiClient.get<SystemHealthResponse>('/api/monitoring/system-health');
  return data;
}
