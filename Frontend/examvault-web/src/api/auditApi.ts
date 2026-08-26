import apiClient from './axiosClient';
import type { AuditLogResponse, AuditModule } from '../types/audit';

export async function getAuditLogs(
  fromUtc: string,
  toUtc: string,
  module?: AuditModule,
  userId?: string,
): Promise<AuditLogResponse[]> {
  const { data } = await apiClient.get<AuditLogResponse[]>('/api/audit-logs', {
    params: { fromUtc, toUtc, module, userId },
  });
  return data;
}

export async function getMyAuditLogs(
  fromUtc?: string,
  toUtc?: string,
  module?: AuditModule,
): Promise<AuditLogResponse[]> {
  const { data } = await apiClient.get<AuditLogResponse[]>('/api/audit-logs/mine', {
    params: { fromUtc, toUtc, module },
  });
  return data;
}
