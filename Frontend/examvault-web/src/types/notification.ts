export type NotificationType = 'Exam' | 'Reminder' | 'Result' | 'System' | 'Account' | 'Announcement' | 'Alert';

export type EmailStatus = 'Pending' | 'Delivered' | 'Failed' | 'Skipped';

export type NotificationSendToType = 'AllStudents' | 'SelectedStudents' | 'ExamCandidates' | 'Admins';

export type NotificationBatchStatus = 'Sent' | 'Scheduled';

export type NotificationHistoryStatus = 'Delivered' | 'Failed' | 'Scheduled';

export type NotificationChannelFilter = 'InAppEmail' | 'InApp' | 'Email';

export const NOTIFICATION_TYPES: NotificationType[] = ['Exam', 'Reminder', 'Result', 'System', 'Account'];

// Separate from NOTIFICATION_TYPES above - Announcement/Alert only make
// sense for the Super Admin's own platform-wide template library (they'd
// be confusing options on a tenant Admin's per-exam notification types),
// so this list is used only by the Platform Notification Templates page.
export const PLATFORM_NOTIFICATION_TYPES: NotificationType[] = ['Announcement', 'Alert', 'System', 'Reminder'];

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedExamId: string | null;
  emailStatus: EmailStatus;
  createdAtUtc: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreferenceResponse {
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export interface SavePreferencesRequest {
  preferences: NotificationPreferenceResponse[];
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: NotificationType;
  sendTo: NotificationSendToType;
  userIds: string[] | null;
  relatedExamId: string | null;
  sendNow: boolean;
  scheduledAtUtc: string | null;
  sendEmail?: boolean;
  sendInApp?: boolean;
}

export interface CreateNotificationResponse {
  batchId: string;
  recipientCount: number;
}

export interface NotificationBatchSummaryResponse {
  batchId: string;
  title: string;
  type: NotificationType;
  recipientCount: number;
  sentAtUtc: string;
  scheduledAtUtc: string | null;
  status: NotificationHistoryStatus;
  delivered: number;
  failed: number;
  skipped: number;
  pending: number;
  channels: string;
  // Only meaningful for the Super Admin's cross-tenant views.
  tenantId: string;
  createdByAdminUserId: string | null;
}

export interface NotificationHistoryResponse {
  items: NotificationBatchSummaryResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface NotificationHistoryStatsResponse {
  sentToday: number;
  delivered: number;
  failed: number;
  scheduled: number;
  total: number;
  pending: number;
}

export interface NotificationBatchDetailsResponse {
  batchId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedExamId: string | null;
  sentAtUtc: string;
  scheduledAtUtc: string | null;
  status: NotificationBatchStatus;
  totalRecipients: number;
  delivered: number;
  failed: number;
  pending: number;
  skipped: number;
}

export interface ResendNotificationResponse {
  newBatchId: string;
  recipientCount: number;
}

export type NotificationTemplateStatus = 'Active' | 'Draft';

export interface NotificationTemplateResponse {
  id: string;
  name: string;
  type: NotificationType;
  sendEmail: boolean;
  sendInApp: boolean;
  channels: string;
  subject: string;
  body: string;
  status: NotificationTemplateStatus;
  updatedAtUtc: string;
}

export interface CreateNotificationTemplateRequest {
  name: string;
  type: NotificationType;
  sendEmail: boolean;
  sendInApp: boolean;
  subject: string;
  body: string;
  isActive: boolean;
}

export type UpdateNotificationTemplateRequest = CreateNotificationTemplateRequest;
