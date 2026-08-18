import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMyPreferences } from '../hooks/useNotifications';
import { saveMyPreferences } from '../api/notificationApi';
import type { NotificationPreferenceResponse, NotificationType } from '../types/notification';

const typeLabel: Record<NotificationType, string> = {
  Exam: 'Exam Assigned',
  Reminder: 'Exam Reminder',
  Result: 'Result Published',
  System: 'System Announcements',
  Account: 'Account Updates',
};

const typeDescription: Record<NotificationType, string> = {
  Exam: 'When you are assigned a new exam',
  Reminder: 'Reminders before an exam starts',
  Result: 'When your exam result is published',
  System: 'Important system-wide announcements',
  Account: 'Account updates such as welcome and password changes',
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

  const updatePreference = (type: NotificationType, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => {
    setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, [field]: value } : p)));
    setSaved(false);
  };

  return (
    <>
      <h2 className="h5 fw-bold mb-1">Notification Preferences</h2>
      <p className="text-muted mb-4">Choose what notifications you want to receive.</p>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load your preferences. Please try again.</div>
          )}

          {!isLoading && !isError && (
            <Table responsive className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Notification Type</th>
                  <th>In-App</th>
                  <th className="pe-4">Email</th>
                </tr>
              </thead>
              <tbody>
                {preferences.map((pref) => (
                  <tr key={pref.type}>
                    <td className="ps-4">
                      <div className="fw-medium">{typeLabel[pref.type]}</div>
                      <div className="text-muted small">{typeDescription[pref.type]}</div>
                    </td>
                    <td>
                      <Form.Check
                        type="switch"
                        checked={pref.inAppEnabled}
                        onChange={(e) => updatePreference(pref.type, 'inAppEnabled', e.target.checked)}
                      />
                    </td>
                    <td className="pe-4">
                      <Form.Check
                        type="switch"
                        checked={pref.emailEnabled}
                        onChange={(e) => updatePreference(pref.type, 'emailEnabled', e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {saved && (
        <Alert variant="success" className="mt-3 mb-0">
          Preferences saved.
        </Alert>
      )}

      <div className="d-flex justify-content-end mt-3">
        <Button variant="primary" disabled={saveMutation.isPending || isLoading} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}
