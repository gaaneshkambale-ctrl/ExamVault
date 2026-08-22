export type NotificationType = 'Exam' | 'Reminder' | 'Result' | 'System' | 'Account';

export type EmailStatus = 'Pending' | 'Delivered' | 'Failed' | 'Skipped';

export type NotificationSendToType = 'AllStudents' | 'SelectedStudents' | 'ExamCandidates' | 'Admins';

export type NotificationBatchStatus = 'Sent' | 'Scheduled';

export const NOTIFICATION_TYPES: NotificationType[] = ['Exam', 'Reminder', 'Result', 'System', 'Account'];

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
  status: NotificationBatchStatus;
}

export interface NotificationHistoryResponse {
  items: NotificationBatchSummaryResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
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
