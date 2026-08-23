import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Table, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyPreferences } from '../hooks/useNotifications';
import { saveMyPreferences } from '../api/notificationApi';
import type { NotificationPreferenceResponse, NotificationType } from '../types/notification';

const typeLabel: Record<NotificationType, string> = {
  Exam: 'Exam Assigned',
  Reminder: 'Exam Reminders',
  Result: 'Result Notifications',
  System: 'System Notifications',
  Account: 'Account Updates',
  Announcement: 'Platform Announcements',
  Alert: 'Platform Alerts',
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
                    <th></th>
                    <th className="text-center">Email</th>
                    <th className="text-center">In-App</th>
                  </tr>
                </thead>
                <tbody>
                  {preferences.map((pref) => (
                    <tr key={pref.type}>
                      <td>{typeLabel[pref.type]}</td>
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
                  ))}
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
