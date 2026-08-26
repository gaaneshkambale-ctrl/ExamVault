import { useQuery } from '@tanstack/react-query';
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
  });
}

export function useNotificationHistoryStats() {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', 'stats'],
    queryFn: getNotificationHistoryStats,
  });
}

export function useNotificationBatchDetails(batchId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', batchId],
    queryFn: () => getNotificationBatchDetails(batchId!),
    enabled: !!batchId,
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
