import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getGeneralSettings, updateGeneralSettings } from '../../../api/examApi';
import type { GeneralSettingsResponse } from '../../../types/exam';

const LANGUAGES = ['English (United States)', 'English (United Kingdom)', 'Hindi', 'Spanish', 'French'];
const TIMEZONES = ['UTC', '(GMT+05:30) Asia/Kolkata', '(GMT-05:00) America/New_York', '(GMT+00:00) Europe/London'];
const DATE_FORMATS = ['DD MMM YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettingsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getGeneralSettings()
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
      const updated = await updateGeneralSettings(settings);
      setSettings(updated);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const update = (patch: Partial<GeneralSettingsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <h1 className="h4 fw-bold mb-1 text-primary">General Settings</h1>
      <p className="text-muted mb-4">Basic information about your organization and system preferences.</p>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <Card.Body className="p-4">
          {status === 'success' && (
            <Alert variant="success" className="py-2">
              General settings saved.
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="danger" className="py-2">
              Couldn't save general settings. Please try again.
            </Alert>
          )}

          {status === 'loading' && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" />
            </div>
          )}

          {settings && (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Organization Name</Form.Label>
                <Form.Control
                  value={settings.organizationName}
                  onChange={(e) => update({ organizationName: e.target.value })}
                  maxLength={200}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Support Email</Form.Label>
                <Form.Control
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => update({ supportEmail: e.target.value })}
                  maxLength={200}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Language</Form.Label>
                <Form.Select value={settings.language} onChange={(e) => update({ language: e.target.value })}>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Timezone</Form.Label>
                <Form.Select value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}>
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Date Format</Form.Label>
                <Form.Select value={settings.dateFormat} onChange={(e) => update({ dateFormat: e.target.value })}>
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Form.Select>
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
