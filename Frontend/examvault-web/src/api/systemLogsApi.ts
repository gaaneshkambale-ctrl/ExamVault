import apiClient from './axiosClient';
import type { SystemErrorLog } from '../types/systemLog';

export interface ListSystemLogsFilters {
  fromUtc: string;
  toUtc: string;
  service?: string;
  severity?: string;
  isResolved?: boolean;
}

export async function listSystemLogs(filters: ListSystemLogsFilters): Promise<SystemErrorLog[]> {
  const { data } = await apiClient.get<SystemErrorLog[]>('/api/system-logs', { params: filters });
  return data;
}

export async function resolveSystemLog(id: string): Promise<void> {
  await apiClient.post(`/api/system-logs/${id}/resolve`);
}
