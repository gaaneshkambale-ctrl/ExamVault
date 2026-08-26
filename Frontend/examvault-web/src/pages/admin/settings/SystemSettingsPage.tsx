import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getSystemSettings, updateSystemSettings } from '../../../api/systemSettingsApi';
import type { SystemSettingsResponse } from '../../../types/systemSettings';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getSystemSettings()
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
      const updated = await updateSystemSettings(settings);
      setSettings(updated);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const update = (patch: Partial<SystemSettingsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <h1 className="h4 fw-bold mb-1 text-primary">System Settings</h1>
      <p className="text-muted mb-4">Configure system behavior, maintenance and operational settings.</p>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <Card.Body className="p-4">
          {status === 'success' && (
            <Alert variant="success" className="py-2">
              System settings saved.
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="danger" className="py-2">
              Couldn't save system settings. Please try again.
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
                id="maintenanceMode"
                label="Maintenance Mode"
                checked={settings.maintenanceModeEnabled}
                onChange={(e) => update({ maintenanceModeEnabled: e.target.checked })}
                className="mb-1"
              />
              <div className="text-muted small mb-3">
                Persisted for now - doesn't yet actually block traffic to the app.
              </div>

              <Form.Group className="mb-3" style={{ maxWidth: 280 }}>
                <Form.Label className="fw-bold">Backup Frequency</Form.Label>
                <Form.Select
                  value={settings.backupFrequency}
                  onChange={(e) => update({ backupFrequency: e.target.value as SystemSettingsResponse['backupFrequency'] })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </Form.Select>
                <div className="text-muted small mt-1">Policy value only - no backup is actually triggered.</div>
              </Form.Group>

              <Form.Group className="mb-3" style={{ maxWidth: 280 }}>
                <Form.Label className="fw-bold">Audit Log Retention (days)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={3650}
                  value={settings.auditLogRetentionDays}
                  onChange={(e) => update({ auditLogRetentionDays: Number(e.target.value) })}
                />
                <div className="text-muted small mt-1">
                  Enforced for real - a daily background job deletes audit log rows older than this.
                </div>
              </Form.Group>

              <Form.Group className="mb-3" style={{ maxWidth: 280 }}>
                <Form.Label className="fw-bold">Log Level</Form.Label>
                <Form.Select
                  value={settings.logLevel}
                  onChange={(e) => update({ logLevel: e.target.value as SystemSettingsResponse['logLevel'] })}
                >
                  <option value="Trace">Trace</option>
                  <option value="Debug">Debug</option>
                  <option value="Information">Information</option>
                  <option value="Warning">Warning</option>
                  <option value="Error">Error</option>
                  <option value="Critical">Critical</option>
                </Form.Select>
                <div className="text-muted small mt-1">
                  Persisted for now - doesn't yet change actual runtime logging.
                </div>
              </Form.Group>

              <Form.Group className="mb-4" style={{ maxWidth: 280 }}>
                <Form.Label className="fw-bold">System Environment</Form.Label>
                <Form.Control value={settings.environment} disabled readOnly />
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
