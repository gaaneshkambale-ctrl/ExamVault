export interface PlatformSettings {
  platformName: string;
  platformTagline: string;
  allowSelfRegistration: boolean;
  maintenanceModeEnabled: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireDigit: boolean;
  passwordRequireSpecialChar: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  defaultTrialDurationDays: number;
  defaultMaxUsers: number | null;
  defaultMaxExams: number | null;
  defaultMaxStudents: number | null;
  n8nWebhookUrl: string | null;
  defaultInAppNotificationsEnabled: boolean;
  defaultEmailNotificationsEnabled: boolean;
  updatedAtUtc: string;
  updatedByUserId: string | null;
  updatedByName: string | null;
}

export type UpdatePlatformSettingsRequest = Omit<PlatformSettings, 'updatedAtUtc' | 'updatedByUserId' | 'updatedByName'>;
