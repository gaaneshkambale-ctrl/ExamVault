import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Button, Card, Form, Table, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyPreferences } from '../hooks/useNotifications';
import { saveMyPreferences } from '../api/notificationApi';
import type { NotificationPreferenceResponse, NotificationType } from '../types/notification';

const typeInfo: Record<NotificationType, { label: string; description: string; iconBg: string; iconColor: string; icon: ReactElement }> = {
  Exam: {
    label: 'Exam Assigned',
    description: 'Notify when an exam is assigned to a student.',
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  Reminder: {
    label: 'Exam Reminders',
    description: 'Send reminders before exam start time.',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  Result: {
    label: 'Result Notifications',
    description: 'Notify when exam results are published.',
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  System: {
    label: 'System Notifications',
    description: 'Important system events and updates.',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  Account: {
    label: 'Account Updates',
    description: 'Notify about account changes and activities.',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  Announcement: {
    label: 'Platform Announcements',
    description: 'Important announcements for all users.',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
  },
  Alert: {
    label: 'Platform Alerts',
    description: 'Critical alerts and security notifications.',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

export default function NotificationPreferencesPanel() {
  const { data, isLoading, isError } = useMyPreferences();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferenceResponse[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setPreferences(data);
      setSaved(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveMyPreferences({ preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      setSaved(true);
    },
  });

  const toggle = (type: NotificationType, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => {
    setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, [field]: value } : p)));
    setSaved(false);
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <h2 className="h6 fw-bold mb-3">Notifications</h2>

        {isLoading && (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" />
          </div>
        )}

        {isError && (
          <div className="text-center text-danger py-5">Couldn't load your preferences. Please try again.</div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="table-responsive mb-4">
              <Table borderless size="sm" className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase">
                  <tr>
                    <th>Notification Type</th>
                    <th className="text-center">Email</th>
                    <th className="text-center">In-App</th>
                  </tr>
                </thead>
                <tbody>
                  {preferences.map((pref) => {
                    const info = typeInfo[pref.type];
                    return (
                      <tr key={pref.type}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                              style={{ width: 32, height: 32, background: info.iconBg, color: info.iconColor }}
                            >
                              {info.icon}
                            </span>
                            <div>
                              <div className="fw-medium small">{info.label}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {info.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <Form.Check
                            type="switch"
                            className="d-inline-block"
                            checked={pref.emailEnabled}
                            onChange={(e) => toggle(pref.type, 'emailEnabled', e.target.checked)}
                          />
                        </td>
                        <td className="text-center">
                          <Form.Check
                            type="switch"
                            className="d-inline-block"
                            checked={pref.inAppEnabled}
                            onChange={(e) => toggle(pref.type, 'inAppEnabled', e.target.checked)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {saved && (
              <Alert variant="success" className="py-2">
                Preferences saved.
              </Alert>
            )}

            <div className="d-flex justify-content-end">
              <Button variant="primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
