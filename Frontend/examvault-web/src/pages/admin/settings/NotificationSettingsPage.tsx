import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getReminderSettings, updateReminderSettings } from '../../../api/examApi';
import NotificationPreferencesPanel from '../../../components/NotificationPreferencesPanel';

// Matches "Notificationn settings.png". Two real, deliberate deviations
// from the mockup, not oversights:
// - No "Additional Reminder Options" (1 day/30/15 minutes before) and no
//   editable hour values on the two real reminders - ReminderSettings.cs
//   only has Enable24HourReminder/Enable1HourReminder, two fixed-timing
//   on/off switches. Inventing configurable lead times or extra slots
//   would need real backend work this ask didn't call for.
// - No "Notification Channels" master Email/In-App switch - no such
//   tenant-wide kill switch exists anywhere; the per-type Email/In-App
//   grid on the right is the only real channel control there is.
// The right panel is per-USER (this Admin's own preferences), not an
// org-wide policy the mockup's copy implies - kept the honest framing
// this page already had rather than copying that implication.
function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function NotificationSettingsPage() {
  const [enable24HourReminder, setEnable24HourReminder] = useState(true);
  const [enable1HourReminder, setEnable1HourReminder] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [bannerOpen, setBannerOpen] = useState(true);

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
      <div className="d-flex align-items-start gap-3 mb-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: '#ede9fe', color: '#7c3aed' }}
        >
          <BellIcon size={22} />
        </div>
        <div>
          <h1 className="h4 fw-bold mb-1">Notification Settings</h1>
          <p className="text-muted mb-0">Manage notifications, reminders and communication preferences.</p>
        </div>
      </div>

      {bannerOpen && (
        <Alert variant="light" className="border d-flex justify-content-between align-items-start mb-4">
          <div>
            <div className="fw-bold text-primary mb-1">Notifications help keep your users informed and engaged.</div>
            <div className="text-muted small">
              Choose which automatic reminders are sent, and which notification types you personally receive.
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setBannerOpen(false)} aria-label="Dismiss" />
        </Alert>
      )}

      <Row className="g-4">
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: 32, height: 32, background: '#ede9fe', color: '#7c3aed' }}
                >
                  <ClockIcon />
                </span>
                <h2 className="h6 fw-bold mb-0">Exam Reminder Settings</h2>
              </div>
              <p className="text-muted small mb-3">
                Configure automatic reminders to be sent to students before their exam starts. Applies to every
                exam.
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
                type="switch"
                id="reminder24h"
                label="Send reminder 24 hours before exam"
                checked={enable24HourReminder}
                onChange={(e) => setEnable24HourReminder(e.target.checked)}
                disabled={status === 'loading'}
                className="mb-2"
              />
              <Form.Check
                type="switch"
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
                  'Save Settings'
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <h2 className="h6 fw-bold mb-2">My Notification Preferences</h2>
          <p className="text-muted small mb-3">
            Choose which notification types you personally receive in-app and by email.
          </p>
          <NotificationPreferencesPanel />
        </Col>
      </Row>
    </AdminLayout>
  );
}
