import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  getMyNotifications,
  getMyPreferences,
  getNotification,
  getNotificationBatchDetails,
  getNotificationHistory,
  getNotificationHistoryStats,
  getNotificationTemplates,
  getUnreadCount,
} from '../api/notificationApi';
import type {
  NotificationChannelFilter,
  NotificationHistoryStatus,
  NotificationTemplateStatus,
  NotificationType,
} from '../types/notification';

// Admin/SuperAdmin notification-history endpoints are also gated by the tenant's
// subscription plan (Feature:Notifications policy) - a 403 there means "not on this
// plan", not a transient failure, so retrying it is pointless.
function retryUnlessClientError(failureCount: number, error: unknown) {
  if (isAxiosError(error) && (error.response?.status ?? 0) >= 400 && (error.response?.status ?? 0) < 500) {
    return false;
  }
  return failureCount < 3;
}

export function useMyNotifications(unreadOnly = false, page = 1, pageSize = 20, enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'mine', unreadOnly, page, pageSize],
    queryFn: () => getMyNotifications(unreadOnly, page, pageSize),
    enabled,
  });
}

export function useNotification(id: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'mine', 'detail', id],
    queryFn: () => getNotification(id!),
    enabled: !!id,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    enabled,
  });
}

export function useMyPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: getMyPreferences,
  });
}

export function useNotificationHistory(
  type: NotificationType | undefined,
  page = 1,
  pageSize = 20,
  search?: string,
  channel?: NotificationChannelFilter,
  status?: NotificationHistoryStatus,
) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', type ?? 'All', page, pageSize, search ?? '', channel ?? 'All', status ?? 'All'],
    queryFn: () => getNotificationHistory(type, page, pageSize, search, channel, status),
    retry: retryUnlessClientError,
  });
}

export function useNotificationHistoryStats() {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', 'stats'],
    queryFn: getNotificationHistoryStats,
    retry: retryUnlessClientError,
  });
}

export function useNotificationBatchDetails(batchId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', batchId],
    queryFn: () => getNotificationBatchDetails(batchId!),
    enabled: !!batchId,
    retry: retryUnlessClientError,
  });
}

export function useNotificationTemplates(
  search?: string,
  type?: NotificationType,
  channel?: NotificationChannelFilter,
  status?: NotificationTemplateStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'templates', search ?? '', type ?? 'All', channel ?? 'All', status ?? 'All'],
    queryFn: () => getNotificationTemplates(search, type, channel, status),
    enabled,
  });
}
