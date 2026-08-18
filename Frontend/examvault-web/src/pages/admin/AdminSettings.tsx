import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { resetUserPassword } from '../../api/userApi';
import {
  getProctoringSettings,
  getReminderSettings,
  updateProctoringSettings,
  updateReminderSettings,
} from '../../api/examApi';
import { useAuth } from '../../hooks/useAuth';
import { extractServerError } from '../../utils/apiError';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

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

  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(true);
  const [multiPersonDetectionEnabled, setMultiPersonDetectionEnabled] = useState(true);
  const [screenMonitoringEnabled, setScreenMonitoringEnabled] = useState(true);
  const [fullscreenExitEnabled, setFullscreenExitEnabled] = useState(true);
  const [multipleTabsEnabled, setMultipleTabsEnabled] = useState(true);
  const [copyPasteBlockingEnabled, setCopyPasteBlockingEnabled] = useState(true);
  const [rightClickBlockingEnabled, setRightClickBlockingEnabled] = useState(true);
  const [proctoringStatus, setProctoringStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>(
    'idle',
  );

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
    setProctoringStatus('loading');
    getProctoringSettings()
      .then((settings) => {
        setProctoringEnabled(settings.proctoringEnabled);
        setFaceDetectionEnabled(settings.faceDetectionEnabled);
        setMultiPersonDetectionEnabled(settings.multiPersonDetectionEnabled);
        setScreenMonitoringEnabled(settings.screenMonitoringEnabled);
        setFullscreenExitEnabled(settings.fullscreenExitEnabled);
        setMultipleTabsEnabled(settings.multipleTabsEnabled);
        setCopyPasteBlockingEnabled(settings.copyPasteBlockingEnabled);
        setRightClickBlockingEnabled(settings.rightClickBlockingEnabled);
        setProctoringStatus('idle');
      })
      .catch(() => setProctoringStatus('error'));
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

  useEffect(() => {
    if (proctoringStatus !== 'success') {
      return;
    }
    const timer = setTimeout(() => setProctoringStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, [proctoringStatus]);

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

  const handleSaveProctoringSettings = async () => {
    setProctoringStatus('saving');
    try {
      const settings = await updateProctoringSettings({
        proctoringEnabled,
        faceDetectionEnabled,
        multiPersonDetectionEnabled,
        screenMonitoringEnabled,
        fullscreenExitEnabled,
        multipleTabsEnabled,
        copyPasteBlockingEnabled,
        rightClickBlockingEnabled,
      });
      setProctoringEnabled(settings.proctoringEnabled);
      setFaceDetectionEnabled(settings.faceDetectionEnabled);
      setMultiPersonDetectionEnabled(settings.multiPersonDetectionEnabled);
      setScreenMonitoringEnabled(settings.screenMonitoringEnabled);
      setFullscreenExitEnabled(settings.fullscreenExitEnabled);
      setMultipleTabsEnabled(settings.multipleTabsEnabled);
      setCopyPasteBlockingEnabled(settings.copyPasteBlockingEnabled);
      setRightClickBlockingEnabled(settings.rightClickBlockingEnabled);
      setProctoringStatus('success');
    } catch {
      setProctoringStatus('error');
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

          <Card className="border-0 shadow-sm mt-4">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-2">AI Proctoring</h2>
              <p className="text-muted small mb-3">
                Choose which proctoring checks run during exams that have proctoring enabled at
                the assignment level. Applies to every such exam.
              </p>

              {proctoringStatus === 'success' && (
                <Alert variant="success" className="py-2">
                  Proctoring settings saved.
                </Alert>
              )}
              {proctoringStatus === 'error' && (
                <Alert variant="danger" className="py-2">
                  Couldn't save proctoring settings. Please try again.
                </Alert>
              )}

              <Form.Check
                type="switch"
                id="proctoringEnabled"
                label="Enable AI proctoring (master switch)"
                checked={proctoringEnabled}
                onChange={(e) => setProctoringEnabled(e.target.checked)}
                disabled={proctoringStatus === 'loading'}
                className="mb-3 fw-bold"
              />

              <fieldset disabled={!proctoringEnabled || proctoringStatus === 'loading'} className="mb-3">
                <Form.Check
                  type="checkbox"
                  id="faceDetectionEnabled"
                  label="Face detection (no face detected)"
                  checked={faceDetectionEnabled}
                  onChange={(e) => setFaceDetectionEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="multiPersonDetectionEnabled"
                  label="Multiple-person detection"
                  checked={multiPersonDetectionEnabled}
                  onChange={(e) => setMultiPersonDetectionEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="screenMonitoringEnabled"
                  label="Screen monitoring (tab switching / browser minimized)"
                  checked={screenMonitoringEnabled}
                  onChange={(e) => setScreenMonitoringEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="fullscreenExitEnabled"
                  label="Fullscreen exit detection"
                  checked={fullscreenExitEnabled}
                  onChange={(e) => setFullscreenExitEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="multipleTabsEnabled"
                  label="Multiple attempts (same exam open in another tab)"
                  checked={multipleTabsEnabled}
                  onChange={(e) => setMultipleTabsEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="copyPasteBlockingEnabled"
                  label="Block copy / paste"
                  checked={copyPasteBlockingEnabled}
                  onChange={(e) => setCopyPasteBlockingEnabled(e.target.checked)}
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="rightClickBlockingEnabled"
                  label="Block right-click"
                  checked={rightClickBlockingEnabled}
                  onChange={(e) => setRightClickBlockingEnabled(e.target.checked)}
                />
              </fieldset>

              <Button
                variant="primary"
                onClick={handleSaveProctoringSettings}
                disabled={proctoringStatus === 'loading' || proctoringStatus === 'saving'}
              >
                {proctoringStatus === 'saving' ? (
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
