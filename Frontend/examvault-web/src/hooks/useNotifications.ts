import { useQuery } from '@tanstack/react-query';
import {
  getMyNotifications,
  getMyPreferences,
  getNotification,
  getNotificationBatchDetails,
  getNotificationHistory,
  getUnreadCount,
} from '../api/notificationApi';
import type { NotificationType } from '../types/notification';

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

export function useNotificationHistory(type: NotificationType | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', type ?? 'All', page, pageSize],
    queryFn: () => getNotificationHistory(type, page, pageSize),
  });
}

export function useNotificationBatchDetails(batchId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', 'admin', 'history', batchId],
    queryFn: () => getNotificationBatchDetails(batchId!),
    enabled: !!batchId,
  });
}
