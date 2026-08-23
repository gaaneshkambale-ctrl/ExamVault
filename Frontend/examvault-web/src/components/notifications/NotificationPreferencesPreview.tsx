import { Card, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationTypeIcon from './NotificationTypeIcon';
import { useMyPreferences } from '../../hooks/useNotifications';
import { saveMyPreferences } from '../../api/notificationApi';
import type { NotificationType } from '../../types/notification';

const previewTypes: NotificationType[] = ['Exam', 'Result', 'System', 'Reminder'];
const previewLabel: Record<NotificationType, { title: string; subtitle: string }> = {
  Exam: { title: 'Exam Notifications', subtitle: 'Updates about exams' },
  Result: { title: 'Result Notifications', subtitle: 'Updates about results' },
  System: { title: 'System Announcements', subtitle: 'Important system updates' },
  Reminder: { title: 'Reminders', subtitle: 'Exam reminders and alerts' },
  Account: { title: 'Account Updates', subtitle: 'Updates about your account' },
  Announcement: { title: 'Platform Announcements', subtitle: 'Updates from the platform team' },
  Alert: { title: 'Platform Alerts', subtitle: 'Important platform alerts' },
};

interface NotificationPreferencesPreviewProps {
  // Either link to the full preferences page (default) or, when this card
  // sits on a page that already hosts the full panel (Settings), just
  // switch that page's own section instead of navigating away.
  manageHref?: string;
  onManageClick?: () => void;
}

// Compact in-app-only toggle preview, shared by My Notifications' sidebar
// and the Settings page's Notification Settings summary card - both want
// the same "quick glance + instant toggle" widget, full editing (including
// email) stays on the dedicated preferences page/section.
export default function NotificationPreferencesPreview({
  manageHref = '/notifications/settings',
  onManageClick,
}: NotificationPreferencesPreviewProps) {
  const queryClient = useQueryClient();
  const { data: preferences } = useMyPreferences();

  const preferencesSaveMutation = useMutation({
    mutationFn: (next: typeof preferences) => saveMyPreferences({ preferences: next! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  });

  const toggleInAppPreference = (type: NotificationType, value: boolean) => {
    if (!preferences) return;
    const next = preferences.map((p) => (p.type === type ? { ...p, inAppEnabled: value } : p));
    preferencesSaveMutation.mutate(next);
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h2 className="h6 fw-bold mb-1">Notification Preferences</h2>
        <p className="text-muted small mb-3">Manage what you want to receive.</p>
        {previewTypes.map((type) => (
          <div key={type} className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <NotificationTypeIcon type={type} />
              <div>
                <div className="small fw-medium">{previewLabel[type].title}</div>
                <div className="text-muted small">{previewLabel[type].subtitle}</div>
              </div>
            </div>
            <Form.Check
              type="switch"
              checked={preferences?.find((p) => p.type === type)?.inAppEnabled ?? false}
              onChange={(e) => toggleInAppPreference(type, e.target.checked)}
              disabled={!preferences}
            />
          </div>
        ))}
        <div className="d-grid">
          {onManageClick ? (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onManageClick}>
              Manage Preferences
            </button>
          ) : (
            <Link to={manageHref} className="btn btn-outline-primary btn-sm">
              Manage Preferences
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
