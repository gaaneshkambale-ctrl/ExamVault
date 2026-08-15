import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { resetUserPassword } from '../../api/userApi';
import { getReminderSettings, updateReminderSettings } from '../../api/examApi';
import { useAuth } from '../../hooks/useAuth';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function AdminSettings() {
  const { user } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const [enable24HourReminder, setEnable24HourReminder] = useState(true);
  const [enable1HourReminder, setEnable1HourReminder] = useState(true);
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setReminderStatus('loading');
    getReminderSettings()
      .then((settings) => {
        setEnable24HourReminder(settings.enable24HourReminder);
        setEnable1HourReminder(settings.enable1HourReminder);
        setReminderStatus('idle');
      })
      .catch(() => setReminderStatus('error'));
  }, []);

  useEffect(() => {
    if (status !== 'success') {
      return;
    }
    const timer = setTimeout(() => setStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (reminderStatus !== 'success') {
      return;
    }
    const timer = setTimeout(() => setReminderStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, [reminderStatus]);

  const handleSaveReminderSettings = async () => {
    setReminderStatus('saving');
    try {
      const settings = await updateReminderSettings({ enable24HourReminder, enable1HourReminder });
      setEnable24HourReminder(settings.enable24HourReminder);
      setEnable1HourReminder(settings.enable1HourReminder);
      setReminderStatus('success');
    } catch {
      setReminderStatus('error');
    }
  };

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setFieldError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }
    setFieldError('');

    setStatus('loading');
    setServerError('');
    try {
      await resetUserPassword(user.id, { newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <AdminLayout active="Settings">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Settings</h1>
        <p className="text-muted mb-0">Manage your account settings.</p>
      </div>

      <Row className="g-4">
        <Col xs={12} lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-3">Change Password</h2>

              {status === 'success' && (
                <Alert variant="success">Your password has been updated.</Alert>
              )}
              {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
              {fieldError && <Alert variant="danger">{fieldError}</Alert>}

              <Form noValidate onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="settingsEmail">
                  <Form.Label className="fw-bold">Email</Form.Label>
                  <Form.Control type="email" value={user.email} disabled readOnly />
                </Form.Group>

                <Form.Group className="mb-3" controlId="settingsNewPassword">
                  <Form.Label className="fw-bold">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="settingsConfirmPassword">
                  <Form.Label className="fw-bold">Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Form.Group>

                <Card body className="bg-light border-0 mb-4">
                  <div className="fw-bold small mb-2">Password must contain:</div>
                  <ul className="list-unstyled mb-0 small">
                    {requirements.map((req) => {
                      const met = req.test(newPassword);
                      return (
                        <li key={req.label} className={met ? 'text-success' : 'text-muted'}>
                          {met ? '✓' : '○'} {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </Card>

                <div className="text-end">
                  <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-2">Notification Settings</h2>
              <p className="text-muted small mb-3">
                Choose which notification types you receive in-app and by email.
              </p>
              <Link to="/notifications/settings" className="btn btn-outline-primary">
                Manage Notification Settings
              </Link>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-2">Exam Reminders</h2>
              <p className="text-muted small mb-3">
                Choose which automatic reminders are sent to students before their exam starts.
                Applies to every exam.
              </p>

              {reminderStatus === 'success' && (
                <Alert variant="success" className="py-2">
                  Reminder settings saved.
                </Alert>
              )}
              {reminderStatus === 'error' && (
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
                disabled={reminderStatus === 'loading'}
                className="mb-2"
              />
              <Form.Check
                type="checkbox"
                id="reminder1h"
                label="Send reminder 1 hour before exam"
                checked={enable1HourReminder}
                onChange={(e) => setEnable1HourReminder(e.target.checked)}
                disabled={reminderStatus === 'loading'}
                className="mb-3"
              />

              <Button
                variant="primary"
                onClick={handleSaveReminderSettings}
                disabled={reminderStatus === 'loading' || reminderStatus === 'saving'}
              >
                {reminderStatus === 'saving' ? (
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
        </Col>
      </Row>
    </AdminLayout>
  );
}
