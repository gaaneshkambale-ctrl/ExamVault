import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import {
  getProctoringSettings,
  getReminderSettings,
  updateProctoringSettings,
  updateReminderSettings,
} from '../../api/examApi';

export default function AdminSettings() {
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
  const [multipleMonitorsEnabled, setMultipleMonitorsEnabled] = useState(true);
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
        setMultipleMonitorsEnabled(settings.multipleMonitorsEnabled);
        setProctoringStatus('idle');
      })
      .catch(() => setProctoringStatus('error'));
  }, []);

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
        multipleMonitorsEnabled,
      });
      setProctoringEnabled(settings.proctoringEnabled);
      setFaceDetectionEnabled(settings.faceDetectionEnabled);
      setMultiPersonDetectionEnabled(settings.multiPersonDetectionEnabled);
      setScreenMonitoringEnabled(settings.screenMonitoringEnabled);
      setFullscreenExitEnabled(settings.fullscreenExitEnabled);
      setMultipleTabsEnabled(settings.multipleTabsEnabled);
      setCopyPasteBlockingEnabled(settings.copyPasteBlockingEnabled);
      setRightClickBlockingEnabled(settings.rightClickBlockingEnabled);
      setMultipleMonitorsEnabled(settings.multipleMonitorsEnabled);
      setProctoringStatus('success');
    } catch {
      setProctoringStatus('error');
    }
  };

  return (
    <AdminLayout active="Settings">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Settings</h1>
        <p className="text-muted mb-0">Manage your account settings.</p>
      </div>

      <Row className="g-4">
        <Col xs={12} lg={8}>
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
                  className="mb-2"
                />
                <Form.Check
                  type="checkbox"
                  id="multipleMonitorsEnabled"
                  label="Multiple-monitor detection"
                  checked={multipleMonitorsEnabled}
                  onChange={(e) => setMultipleMonitorsEnabled(e.target.checked)}
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
