import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import ToggleRow from '../../../components/ToggleRow';
import { getProctoringSettings, updateProctoringSettings } from '../../../api/examApi';
import type { ProctoringSettingsResponse } from '../../../types/exam';

// Matches the "ChatGPT Image Sep 5, 2026" Proctoring Settings mockup.
// Edits the same ProctoringSettings entity/endpoint as Security Settings -
// this page surfaces the full field set (the master switch + all 8
// individual checks), Security Settings surfaces a subset of the same
// fields under a different grouping. The mockup's "You can override these
// settings for specific exams if needed" line doesn't hold for this system
// (same finding SecuritySettingsPage.tsx already made) - there is no
// per-exam ProctoringSettings row, only this one tenant-wide row, read live
// on every attempt (TakeExam.tsx) - so that line is replaced with the
// accurate "applies to every exam, including ones already in progress"
// instead of copying the mockup's claim verbatim.
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

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function ExitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const IMPORTANT_NOTES = [
  'AI proctoring uses webcam and browser activity to detect suspicious behavior.',
  'Make sure to inform students about the proctoring policy before the exam.',
  'Some checks may require browser permissions (camera access).',
  'Changes apply to every exam immediately, including ones already in progress.',
  'All proctoring events are logged and can be viewed under Live Monitoring.',
];

export default function ProctoringSettingsPage() {
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

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
        <div className="d-flex align-items-start gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: '#ede9fe', color: '#7c3aed' }}
          >
            <ShieldIcon size={22} />
          </div>
          <div>
            <h1 className="h4 fw-bold mb-1">Proctoring Settings</h1>
            <p className="text-muted mb-0">
              Configure AI proctoring checks and monitoring rules to ensure a fair and secure examination
              environment.
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-sm" style={{ minWidth: 260 }}>
          <Card.Body className="p-3 d-flex align-items-start gap-2">
            <span
              className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
              style={{ width: 36, height: 36, background: '#dcfce7', color: '#16a34a' }}
            >
              <ShieldIcon />
            </span>
            <div>
              <div className="fw-bold small">AI Proctoring</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Helps maintain exam integrity and prevents unfair practices.
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {status === 'loading' && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {status === 'error' && !settings && (
        <div className="text-center text-danger py-5">Couldn't load proctoring settings. Please try again.</div>
      )}

      {settings && (
        <>
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

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body className="p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
              <Form.Check
                type="switch"
                id="proctoringEnabled"
                label={
                  <div>
                    <div className="fw-bold">Enable AI proctoring (master switch)</div>
                    <div className="text-muted small">Turn on or off all proctoring checks for online exams.</div>
                  </div>
                }
                checked={settings.proctoringEnabled}
                onChange={(e) => update({ proctoringEnabled: e.target.checked })}
              />
              <Badge bg={settings.proctoringEnabled ? 'success' : 'secondary'} className="px-3 py-2">
                <div className="d-flex align-items-center gap-1 fw-bold">
                  {settings.proctoringEnabled ? <CheckIcon /> : null} {settings.proctoringEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 'normal' }}>
                  {settings.proctoringEnabled ? 'All proctoring checks are active' : 'All proctoring checks are off'}
                </div>
              </Badge>
            </Card.Body>
          </Card>

          <Row className="g-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-4">
                  <h2 className="h6 fw-bold mb-1">Proctoring Checks</h2>
                  <p className="text-muted small mb-3">Select the checks you want to enable during online exams.</p>

                  <fieldset disabled={!settings.proctoringEnabled}>
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <UserIcon /> Face detection (no face detected)
                        </span>
                      }
                      description="Detects if the student's face is not visible during the exam."
                      checked={settings.faceDetectionEnabled}
                      onChange={(v) => update({ faceDetectionEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <UsersIcon /> Multiple-person detection
                        </span>
                      }
                      description="Detects multiple people in the camera frame."
                      checked={settings.multiPersonDetectionEnabled}
                      onChange={(v) => update({ multiPersonDetectionEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <MonitorIcon /> Screen monitoring
                        </span>
                      }
                      description="Detects tab switching, browser minimized, or leaving the exam window."
                      checked={settings.screenMonitoringEnabled}
                      onChange={(v) => update({ screenMonitoringEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <ExitIcon /> Fullscreen exit detection
                        </span>
                      }
                      description="Detects if the student exits fullscreen mode."
                      checked={settings.fullscreenExitEnabled}
                      onChange={(v) => update({ fullscreenExitEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <CopyIcon /> Multiple attempts
                        </span>
                      }
                      description="Prevents the same exam from being opened in another tab or device."
                      checked={settings.multipleTabsEnabled}
                      onChange={(v) => update({ multipleTabsEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <FileIcon /> Block copy / paste
                        </span>
                      }
                      description="Disables copy and paste during the exam."
                      checked={settings.copyPasteBlockingEnabled}
                      onChange={(v) => update({ copyPasteBlockingEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <MouseIcon /> Block right-click
                        </span>
                      }
                      description="Disables right-click context menu during the exam."
                      checked={settings.rightClickBlockingEnabled}
                      onChange={(v) => update({ rightClickBlockingEnabled: v })}
                      disabled={false}
                    />
                    <ToggleRow
                      label={
                        <span className="d-flex align-items-center gap-2">
                          <MonitorsIcon /> Multiple-monitor detection
                        </span>
                      }
                      description="Detects if multiple monitors are connected."
                      checked={settings.multipleMonitorsEnabled}
                      onChange={(v) => update({ multipleMonitorsEnabled: v })}
                      disabled={false}
                    />
                  </fieldset>
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-end gap-2">
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
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{ width: 32, height: 32, background: '#ede9fe', color: '#7c3aed' }}
                    >
                      <ClockIcon />
                    </span>
                    <h2 className="h6 fw-bold mb-0">Session Settings</h2>
                  </div>
                  <p className="text-muted small mb-3">Configure session duration and monitoring behaviour.</p>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Session Timeout (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      max={480}
                      value={settings.sessionTimeoutMinutes}
                      onChange={(e) => update({ sessionTimeoutMinutes: Number(e.target.value) })}
                    />
                    <Form.Text className="text-muted">
                      If no activity is detected for the specified time, the exam will be automatically submitted.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex align-items-start gap-2 p-3 rounded-3 bg-primary-subtle">
                    <span className="text-primary flex-shrink-0 mt-1">
                      <InfoIcon />
                    </span>
                    <div className="small">
                      <span className="fw-bold text-primary">Recommended: 30-120 minutes</span>
                      <div className="text-muted">Choose a value based on the average duration of your exams.</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span className="text-primary">
                      <FileTextIcon />
                    </span>
                    <h2 className="h6 fw-bold mb-0">Important Notes</h2>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {IMPORTANT_NOTES.map((line) => (
                      <div key={line} className="d-flex align-items-start gap-2 small">
                        <span className="text-success flex-shrink-0 mt-1">
                          <CheckIcon />
                        </span>
                        {line}
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
}
