import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getProctoringSettings, updateProctoringSettings } from '../../../api/examApi';
import type { ProctoringSettingsResponse } from '../../../types/exam';

// Edits the same ProctoringSettings entity/endpoint as the Proctoring page -
// Fullscreen/Tab-Switching/Copy-Paste/Right-Click are genuinely the same
// fields the mockup's Security AND Proctoring cards both show, so this page
// loads the full settings object and only surfaces the subset (+ Session
// Timeout) that's this card's concern, saving the rest back unchanged.
export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<ProctoringSettingsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getProctoringSettings()
      .then((s) => {
        setSettings(s);
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
    if (!settings) return;
    setStatus('saving');
    try {
      const updated = await updateProctoringSettings(settings);
      setSettings(updated);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const update = (patch: Partial<ProctoringSettingsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <h1 className="h4 fw-bold mb-1 text-primary">Security Settings</h1>
      <p className="text-muted mb-4">Control exam environment security and access restrictions.</p>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <Card.Body className="p-4">
          {status === 'success' && (
            <Alert variant="success" className="py-2">
              Security settings saved.
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="danger" className="py-2">
              Couldn't save security settings. Please try again.
            </Alert>
          )}

          {status === 'loading' && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" />
            </div>
          )}

          {settings && (
            <>
              <Form.Check
                type="switch"
                id="fullscreenEnforcement"
                label="Fullscreen Enforcement"
                checked={settings.fullscreenExitEnabled}
                onChange={(e) => update({ fullscreenExitEnabled: e.target.checked })}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="tabSwitchingDetection"
                label="Tab Switching Detection"
                checked={settings.multipleTabsEnabled}
                onChange={(e) => update({ multipleTabsEnabled: e.target.checked })}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="copyPasteRestriction"
                label="Copy / Paste Restriction"
                checked={settings.copyPasteBlockingEnabled}
                onChange={(e) => update({ copyPasteBlockingEnabled: e.target.checked })}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="rightClickRestriction"
                label="Right-Click Restriction"
                checked={settings.rightClickBlockingEnabled}
                onChange={(e) => update({ rightClickBlockingEnabled: e.target.checked })}
                className="mb-3"
              />
              <Form.Check
                type="switch"
                id="multipleMonitorDetection"
                label="Multiple Monitor Detection"
                checked={settings.multipleMonitorsEnabled}
                onChange={(e) => update({ multipleMonitorsEnabled: e.target.checked })}
                className="mb-3"
              />

              <Form.Group className="mb-3" style={{ maxWidth: 240 }}>
                <Form.Label className="fw-bold small">Session Timeout (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={480}
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => update({ sessionTimeoutMinutes: Number(e.target.value) })}
                />
              </Form.Group>

              <Button variant="primary" onClick={handleSave} disabled={status === 'saving'}>
                {status === 'saving' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
