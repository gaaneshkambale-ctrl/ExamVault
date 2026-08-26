import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getProctoringSettings, updateProctoringSettings } from '../../../api/examApi';

// Relocated verbatim from the old single-page AdminSettings.tsx (unchanged
// behavior) - now reachable via the Settings hub's Proctoring card.
export default function ProctoringSettingsPage() {
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(true);
  const [multiPersonDetectionEnabled, setMultiPersonDetectionEnabled] = useState(true);
  const [screenMonitoringEnabled, setScreenMonitoringEnabled] = useState(true);
  const [fullscreenExitEnabled, setFullscreenExitEnabled] = useState(true);
  const [multipleTabsEnabled, setMultipleTabsEnabled] = useState(true);
  const [copyPasteBlockingEnabled, setCopyPasteBlockingEnabled] = useState(true);
  const [rightClickBlockingEnabled, setRightClickBlockingEnabled] = useState(true);
  const [multipleMonitorsEnabled, setMultipleMonitorsEnabled] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
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
        setSessionTimeoutMinutes(settings.sessionTimeoutMinutes);
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
        sessionTimeoutMinutes,
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
      setSessionTimeoutMinutes(settings.sessionTimeoutMinutes);
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
      <h1 className="h4 fw-bold mb-1 text-primary">Proctoring Settings</h1>
      <p className="text-muted mb-4">Configure AI proctoring checks and monitoring rules.</p>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <Card.Body className="p-4">
          {status === 'success' && (
            <Alert variant="success" className="py-2">
              Proctoring settings saved.
            </Alert>
          )}
          {status === 'error' && (
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
            disabled={status === 'loading'}
            className="mb-3 fw-bold"
          />

          <fieldset disabled={!proctoringEnabled || status === 'loading'} className="mb-3">
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

          <Form.Group className="mb-3" style={{ maxWidth: 240 }}>
            <Form.Label className="fw-bold small">Session Timeout (minutes)</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={480}
              value={sessionTimeoutMinutes}
              onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
              disabled={status === 'loading'}
            />
          </Form.Group>

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
    </AdminLayout>
  );
}
