export type BackupFrequency = 'Daily' | 'Weekly' | 'Monthly';
export type SystemLogLevel = 'Trace' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Critical';

export interface SystemSettingsResponse {
  maintenanceModeEnabled: boolean;
  backupFrequency: BackupFrequency;
  auditLogRetentionDays: number;
  logLevel: SystemLogLevel;
  environment: string;
  updatedAtUtc: string;
}

export interface UpdateSystemSettingsRequest {
  maintenanceModeEnabled: boolean;
  backupFrequency: BackupFrequency;
  auditLogRetentionDays: number;
  logLevel: SystemLogLevel;
}
