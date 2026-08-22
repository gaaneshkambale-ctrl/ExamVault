import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/auditApi';
import type { AuditModule } from '../types/audit';

export function useAuditLogs(fromUtc: string, toUtc: string, module?: AuditModule, userId?: string) {
  return useQuery({
    queryKey: ['auditLogs', fromUtc, toUtc, module, userId],
    queryFn: () => getAuditLogs(fromUtc, toUtc, module, userId),
  });
}
