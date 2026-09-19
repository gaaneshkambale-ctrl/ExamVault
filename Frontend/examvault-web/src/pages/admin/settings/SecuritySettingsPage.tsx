import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import ToggleRow from '../../../components/ToggleRow';
import { getProctoringSettings, updateProctoringSettings } from '../../../api/examApi';
import type { ProctoringSettingsResponse } from '../../../types/exam';

// Matches "security settings.png". Edits the same ProctoringSettings
// entity/endpoint as the Proctoring page - Fullscreen/Tab-Switching/
// Copy-Paste/Right-Click are genuinely the same fields the mockup's
// Security AND Proctoring cards both show, so this page loads the full
// settings object and only surfaces the subset (+ Session Timeout) that's
// this card's concern, saving the rest back unchanged.
//
// The mockup's own info-banner text ("apply to all newly created exams,
// existing exams not affected") doesn't hold for this system - confirmed
// via TakeExam.tsx, which reads this same tenant-wide row live on every
// attempt, not a snapshot baked in at exam creation (unlike Exam
// Settings' ExamDefaults, which genuinely IS creation-time-only). Used
// the accurate version instead of copying the mockup's claim verbatim.
const FACTORY_DEFAULTS: Omit<ProctoringSettingsResponse, 'updatedAtUtc'> = {
  proctoringEnabled: true,
  faceDetectionEnabled: true,
  multiPersonDetectionEnabled: true,
  screenMonitoringEnabled: true,
  fullscreenExitEnabled: true,
  multipleTabsEnabled: true,
  copyPasteBlockingEnabled: true,
  rightClickBlockingEnabled: true,
  multipleMonitorsEnabled: true,
  sessionTimeoutMinutes: 30,
};

function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function MouseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="6" />
      <line x1="12" y1="6" x2="12" y2="10" />
    </svg>
  );
}

function MonitorsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="14" height="10" rx="1" />
      <rect x="11" y="9" width="12" height="9" rx="1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

const BEST_PRACTICES = [
  'Enable fullscreen mode to minimize distractions',
  'Keep tab switching detection enabled',
  'Use multiple monitor detection for high-stakes exams',
  'Set an appropriate session timeout',
  'Communicate these rules to students before the exam',
];

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<ProctoringSettingsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [bannerOpen, setBannerOpen] = useState(true);

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

  const handleReset = () => {
    setSettings((prev) => (prev ? { ...prev, ...FACTORY_DEFAULTS } : prev));
  };

  const update = (patch: Partial<ProctoringSettingsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

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
          <ShieldIcon size={22} />
        </div>
        <div>
          <h1 className="h4 fw-bold mb-1">Security Settings</h1>
          <p className="text-muted mb-0">Control exam environment security and access restrictions.</p>
        </div>
      </div>

      {bannerOpen && (
        <Alert variant="light" className="border d-flex justify-content-between align-items-start mb-4">
          <div>
            <div className="fw-bold text-primary mb-1">These settings apply immediately to every exam.</div>
            <div className="text-muted small">
              Students already mid-attempt and any future attempt are both affected as soon as you save - this
              isn't limited to newly created exams.
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setBannerOpen(false)} aria-label="Dismiss" />
        </Alert>
      )}

      {status === 'loading' && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {status === 'error' && !settings && (
        <div className="text-center text-danger py-5">Couldn't load security settings. Please try again.</div>
      )}

      {settings && (
        <Row className="g-3">
          <Col lg={8}>
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

            <Card className="border-0 shadow-sm mb-3">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span
                    className="d-flex align-items-center justify-content-center rounded-2"
                    style={{ width: 32, height: 32, background: '#ede9fe', color: '#7c3aed' }}
                  >
                    <ShieldIcon />
                  </span>
                  <h2 className="h6 fw-bold mb-0">Browser &amp; Access Restrictions</h2>
                </div>
                <p className="text-muted small mb-3">Enable or disable security features for the exam environment.</p>

                <ToggleRow
                  label={
                    <span className="d-flex align-items-center gap-2">
                      <MonitorIcon /> Fullscreen Enforcement
                    </span>
                  }
                  description="Require students to take the exam in fullscreen mode."
                  checked={settings.fullscreenExitEnabled}
                  onChange={(v) => update({ fullscreenExitEnabled: v })}
                  disabled={false}
                />
                <ToggleRow
                  label={
                    <span className="d-flex align-items-center gap-2">
                      <WindowIcon /> Tab Switching Detection
                    </span>
                  }
                  description="Detect when a student switches to another tab or application."
                  checked={settings.multipleTabsEnabled}
                  onChange={(v) => update({ multipleTabsEnabled: v })}
                  disabled={false}
                />
                <ToggleRow
                  label={
                    <span className="d-flex align-items-center gap-2">
                      <FileIcon /> Copy / Paste Restriction
                    </span>
                  }
                  description="Disable copy and paste actions during the exam."
                  checked={settings.copyPasteBlockingEnabled}
                  onChange={(v) => update({ copyPasteBlockingEnabled: v })}
                  disabled={false}
                />
                <ToggleRow
                  label={
                    <span className="d-flex align-items-center gap-2">
                      <MouseIcon /> Right-Click Restriction
                    </span>
                  }
                  description="Disable right-click context menu during the exam."
                  checked={settings.rightClickBlockingEnabled}
                  onChange={(v) => update({ rightClickBlockingEnabled: v })}
                  disabled={false}
                />
                <ToggleRow
                  label={
                    <span className="d-flex align-items-center gap-2">
                      <MonitorsIcon /> Multiple Monitor Detection
                    </span>
                  }
                  description="Detect and block exams if multiple monitors are connected."
                  checked={settings.multipleMonitorsEnabled}
                  onChange={(v) => update({ multipleMonitorsEnabled: v })}
                  disabled={false}
                />
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-3">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span
                    className="d-flex align-items-center justify-content-center rounded-2"
                    style={{ width: 32, height: 32, background: '#ede9fe', color: '#7c3aed' }}
                  >
                    <ClockIcon />
                  </span>
                  <h2 className="h6 fw-bold mb-0">Session Control</h2>
                </div>
                <p className="text-muted small mb-3">Configure session timeout and inactivity settings.</p>

                <Form.Group style={{ maxWidth: 280 }}>
                  <Form.Label className="fw-bold small">Session Timeout (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={480}
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => update({ sessionTimeoutMinutes: Number(e.target.value) })}
                  />
                  <Form.Text className="text-muted">
                    If there is no activity for this duration, the exam will be auto-submitted.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between align-items-center">
              <Button variant="outline-secondary" onClick={handleReset} disabled={status === 'saving'}>
                Reset to Default
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={status === 'saving'}>
                {status === 'saving' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-3 bg-success-subtle">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 32, height: 32, background: '#16a34a', color: 'white' }}
                  >
                    <CheckCircleIcon />
                  </span>
                  <h2 className="h6 fw-bold mb-0">Enhanced Exam Security</h2>
                </div>
                <p className="text-muted small mb-3">
                  These security measures help ensure a fair and controlled exam environment.
                </p>
                <div className="d-flex flex-column gap-2">
                  {['Prevent unauthorized access and cheating', 'Maintain exam integrity', 'Monitor suspicious activities', 'Applicable to all new exams', "Can be customized as per your organization's policy"].map(
                    (line) => (
                      <div key={line} className="d-flex align-items-start gap-2 small">
                        <span className="text-success flex-shrink-0 mt-1">
                          <CheckCircleIcon />
                        </span>
                        {line}
                      </div>
                    ),
                  )}
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm bg-primary-subtle">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="text-primary">
                    <BulbIcon />
                  </span>
                  <h2 className="h6 fw-bold mb-0">Best Practices</h2>
                </div>
                <div className="d-flex flex-column gap-2">
                  {BEST_PRACTICES.map((line) => (
                    <div key={line} className="d-flex align-items-start gap-2 small">
                      <span className="text-primary flex-shrink-0 mt-1">
                        <CheckCircleIcon />
                      </span>
                      {line}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </AdminLayout>
  );
}
