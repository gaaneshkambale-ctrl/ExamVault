export type SystemLogSeverity = 'Warning' | 'Error' | 'Critical';

export interface SystemErrorLog {
  id: string;
  timestampUtc: string;
  service: string;
  severity: SystemLogSeverity;
  message: string;
  exceptionType: string | null;
  stackTrace: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  tenantId: string | null;
  isResolved: boolean;
  resolvedAtUtc: string | null;
  resolvedByUserId: string | null;
}
