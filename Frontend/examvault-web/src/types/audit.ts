export type AuditModule = 'Auth' | 'Users' | 'Exams' | 'Questions' | 'Results' | 'Security';

export interface AuditLogResponse {
  id: string;
  timestampUtc: string;
  module: AuditModule;
  activity: string;
  details: string | null;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  ipAddress: string | null;
  // Only meaningful for a Super Admin's cross-tenant Security views.
  tenantId: string;
}
