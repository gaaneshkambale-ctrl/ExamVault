import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getReminderSettings, updateReminderSettings } from '../../../api/examApi';
import NotificationPreferencesPanel from '../../../components/NotificationPreferencesPanel';

// Reminders relocated verbatim from the old single-page AdminSettings.tsx
// (unchanged behavior). The per-type email/in-app toggles are a distinct,
// already-real, per-USER concept (NotificationPreference) - embedded directly
// below via the same panel component /notifications/settings uses, rather
// than just linking out to it, so everything for this category lives on one
// page.
export default function NotificationSettingsPage() {
  const [enable24HourReminder, setEnable24HourReminder] = useState(true);
  const [enable1HourReminder, setEnable1HourReminder] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getReminderSettings()
      .then((settings) => {
        setEnable24HourReminder(settings.enable24HourReminder);
        setEnable1HourReminder(settings.enable1HourReminder);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => setStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSave = async () => {
    setStatus('saving');
    try {
      const settings = await updateReminderSettings({ enable24HourReminder, enable1HourReminder });
      setEnable24HourReminder(settings.enable24HourReminder);
      setEnable1HourReminder(settings.enable1HourReminder);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <h1 className="h4 fw-bold mb-1 text-primary">Notification Settings</h1>
      <p className="text-muted mb-4">Manage notifications, reminders and communication preferences.</p>

      <Card className="border-0 shadow-sm mb-4" style={{ maxWidth: 640 }}>
        <Card.Body className="p-4">
          <h2 className="h6 fw-bold mb-2">Exam Reminders</h2>
          <p className="text-muted small mb-3">
            Choose which automatic reminders are sent to students before their exam starts. Applies to every exam.
          </p>

          {status === 'success' && (
            <Alert variant="success" className="py-2">
              Reminder settings saved.
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="danger" className="py-2">
              Couldn't save reminder settings. Please try again.
            </Alert>
          )}

          <Form.Check
            type="checkbox"
            id="reminder24h"
            label="Send reminder 24 hours before exam"
            checked={enable24HourReminder}
            onChange={(e) => setEnable24HourReminder(e.target.checked)}
            disabled={status === 'loading'}
            className="mb-2"
          />
          <Form.Check
            type="checkbox"
            id="reminder1h"
            label="Send reminder 1 hour before exam"
            checked={enable1HourReminder}
            onChange={(e) => setEnable1HourReminder(e.target.checked)}
            disabled={status === 'loading'}
            className="mb-3"
          />

          <Button variant="primary" onClick={handleSave} disabled={status === 'loading' || status === 'saving'}>
            {status === 'saving' ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </Card.Body>
      </Card>

      <div style={{ maxWidth: 640 }}>
        <h2 className="h6 fw-bold mb-2">My Notification Preferences</h2>
        <p className="text-muted small mb-3">
          Choose which notification types you personally receive in-app and by email.
        </p>
        <NotificationPreferencesPanel />
      </div>
    </AdminLayout>
  );
}
