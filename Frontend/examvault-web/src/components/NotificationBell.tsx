import { Badge, Dropdown, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useMyNotifications, useUnreadCount } from '../hooks/useNotifications';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../api/notificationApi';
import type { NotificationResponse } from '../types/notification';

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const basePath = user?.role === 'Admin' ? '/admin/notifications' : '/notifications';

  const { data: unread } = useUnreadCount(!!user);
  const { data: latest, isLoading } = useMyNotifications(false, 1, 5, !!user);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleItemClick = (notification: NotificationResponse) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    navigate(`${basePath}/${notification.id}`);
  };

  if (!user) {
    return null;
  }

  const unreadCount = unread?.count ?? 0;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="div"
        bsPrefix="notification-bell-toggle"
        className="position-relative"
        style={{ cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
      >
        &#128276;
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: 10 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: 320 }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2">
          <span className="fw-bold small">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 small"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </button>
          )}
        </div>
        <Dropdown.Divider />

        {isLoading && (
          <div className="d-flex justify-content-center py-3">
            <Spinner animation="border" size="sm" />
          </div>
        )}

        {!isLoading && (latest?.items.length ?? 0) === 0 && (
          <div className="text-center text-muted small py-3">No notifications yet.</div>
        )}

        {!isLoading &&
          latest?.items.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className="dropdown-item d-flex align-items-start gap-2 py-2"
              onClick={() => handleItemClick(notification)}
            >
              <span
                className="rounded-circle flex-shrink-0 mt-1"
                style={{
                  width: 8,
                  height: 8,
                  background: notification.isRead ? 'transparent' : '#4f46e5',
                }}
              />
              <span className="flex-grow-1 text-start">
                <span className={`d-block small ${notification.isRead ? '' : 'fw-semibold'}`}>
                  {notification.title}
                </span>
                <span className="d-block text-muted" style={{ fontSize: 11 }}>
                  {timeAgo(notification.createdAtUtc)}
                </span>
              </span>
            </button>
          ))}

        <Dropdown.Divider />
        <Dropdown.Item as={Link} to={basePath} className="text-center small fw-medium">
          View All
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
