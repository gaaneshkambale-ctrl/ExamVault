import apiClient from './axiosClient';
import type {
  CreateNotificationRequest,
  CreateNotificationResponse,
  CreateNotificationTemplateRequest,
  NotificationBatchDetailsResponse,
  NotificationChannelFilter,
  NotificationHistoryResponse,
  NotificationHistoryStatsResponse,
  NotificationHistoryStatus,
  NotificationListResponse,
  NotificationPreferenceResponse,
  NotificationResponse,
  NotificationTemplateResponse,
  NotificationTemplateStatus,
  NotificationType,
  ResendNotificationResponse,
  SavePreferencesRequest,
  UnreadCountResponse,
  UpdateNotificationTemplateRequest,
} from '../types/notification';

// ---------- Mine ----------

export async function getMyNotifications(
  unreadOnly = false,
  page = 1,
  pageSize = 20,
): Promise<NotificationListResponse> {
  const { data } = await apiClient.get<NotificationListResponse>('/api/notifications', {
    params: { unreadOnly, page, pageSize },
  });
  return data;
}

export async function getNotification(id: string): Promise<NotificationResponse> {
  const { data } = await apiClient.get<NotificationResponse>(`/api/notifications/${id}`);
  return data;
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>('/api/notifications/unread-count');
  return data;
}

export async function markNotificationAsRead(id: string): Promise<NotificationResponse> {
  const { data } = await apiClient.put<NotificationResponse>(`/api/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead(): Promise<{ markedCount: number }> {
  const { data } = await apiClient.post<{ markedCount: number }>('/api/notifications/read-all');
  return data;
}

export async function deleteMyNotification(id: string): Promise<void> {
  await apiClient.delete(`/api/notifications/${id}`);
}

export async function getMyPreferences(): Promise<NotificationPreferenceResponse[]> {
  const { data } = await apiClient.get<NotificationPreferenceResponse[]>('/api/notifications/preferences');
  return data;
}

export async function saveMyPreferences(request: SavePreferencesRequest): Promise<void> {
  await apiClient.put('/api/notifications/preferences', request);
}

// ---------- Admin ----------

export async function createNotification(request: CreateNotificationRequest): Promise<CreateNotificationResponse> {
  const { data } = await apiClient.post<CreateNotificationResponse>('/api/notifications/admin', request);
  return data;
}

export async function getNotificationHistory(
  type?: NotificationType,
  page = 1,
  pageSize = 20,
  search?: string,
  channel?: NotificationChannelFilter,
  status?: NotificationHistoryStatus,
): Promise<NotificationHistoryResponse> {
  const { data } = await apiClient.get<NotificationHistoryResponse>('/api/notifications/admin/history', {
    params: { type, page, pageSize, search: search || undefined, channel, status },
  });
  return data;
}

export async function getNotificationHistoryStats(): Promise<NotificationHistoryStatsResponse> {
  const { data } = await apiClient.get<NotificationHistoryStatsResponse>('/api/notifications/admin/history/stats');
  return data;
}

export async function getNotificationBatchDetails(batchId: string): Promise<NotificationBatchDetailsResponse> {
  const { data } = await apiClient.get<NotificationBatchDetailsResponse>(
    `/api/notifications/admin/history/${batchId}`,
  );
  return data;
}

export async function resendNotificationBatch(batchId: string): Promise<ResendNotificationResponse> {
  const { data } = await apiClient.post<ResendNotificationResponse>(
    `/api/notifications/admin/history/${batchId}/resend`,
  );
  return data;
}

export async function deleteNotificationBatch(batchId: string): Promise<void> {
  await apiClient.delete(`/api/notifications/admin/history/${batchId}`);
}

// ---------- Admin: Templates ----------

export async function getNotificationTemplates(
  search?: string,
  type?: NotificationType,
  channel?: NotificationChannelFilter,
  status?: NotificationTemplateStatus,
): Promise<NotificationTemplateResponse[]> {
  const { data } = await apiClient.get<NotificationTemplateResponse[]>('/api/notifications/admin/templates', {
    params: { search: search || undefined, type, channel, status },
  });
  return data;
}

export async function createNotificationTemplate(
  request: CreateNotificationTemplateRequest,
): Promise<NotificationTemplateResponse> {
  const { data } = await apiClient.post<NotificationTemplateResponse>('/api/notifications/admin/templates', request);
  return data;
}

export async function updateNotificationTemplate(
  id: string,
  request: UpdateNotificationTemplateRequest,
): Promise<NotificationTemplateResponse> {
  const { data } = await apiClient.put<NotificationTemplateResponse>(
    `/api/notifications/admin/templates/${id}`,
    request,
  );
  return data;
}

export async function duplicateNotificationTemplate(id: string): Promise<NotificationTemplateResponse> {
  const { data } = await apiClient.post<NotificationTemplateResponse>(
    `/api/notifications/admin/templates/${id}/duplicate`,
  );
  return data;
}
