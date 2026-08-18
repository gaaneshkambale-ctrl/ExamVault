import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, ListGroup, Spinner } from 'react-bootstrap';
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
};

// Theme and language aren't wired to anything real yet - no app-wide dark
// mode, no i18n system - so they're saved as plain local preferences rather
// than sent to the backend. Kept separate from the notification toggles
// (which are real) so it's obvious these two don't do anything visible yet.
type Theme = 'Light' | 'Dark' | 'System';
const THEME_STORAGE_KEY = 'examvault.preferences.theme';

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'Light' || stored === 'Dark' || stored === 'System' ? stored : 'Light';
}

export default function NotificationPreferencesPanel() {
  const { data, isLoading, isError } = useMyPreferences();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferenceResponse[]>([]);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setPreferences(data);
      setSaved(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      await saveMyPreferences({ preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      setSaved(true);
    },
  });

  const toggleInApp = (type: NotificationType, value: boolean) => {
    setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, inAppEnabled: value } : p)));
    setSaved(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h5 fw-bold mb-4">Preferences</h2>

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
            <ListGroup variant="flush" className="border rounded-3 mb-4">
              {preferences.map((pref) => (
                <ListGroup.Item key={pref.type} className="d-flex justify-content-between align-items-center py-3">
                  <span>{typeLabel[pref.type]}</span>
                  <Form.Check
                    type="switch"
                    checked={pref.inAppEnabled}
                    onChange={(e) => toggleInApp(pref.type, e.target.checked)}
                  />
                </ListGroup.Item>
              ))}
            </ListGroup>

            <Form.Group className="mb-4">
              <Form.Label className="text-muted small">Language</Form.Label>
              <Form.Select value="English" disabled style={{ maxWidth: 260 }}>
                <option>English</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="text-muted small d-block">Theme</Form.Label>
              <div className="d-flex gap-4">
                {(['Light', 'Dark', 'System'] as const).map((option) => (
                  <Form.Check
                    key={option}
                    type="radio"
                    id={`theme-${option}`}
                    name="theme"
                    label={option}
                    checked={theme === option}
                    onChange={() => {
                      setTheme(option);
                      setSaved(false);
                    }}
                  />
                ))}
              </div>
            </Form.Group>

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
