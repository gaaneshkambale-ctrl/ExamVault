import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import ToggleRow from '../../../components/ToggleRow';
import { getExamDefaults, updateExamDefaults } from '../../../api/examApi';
import type { ExamDefaultsResponse } from '../../../types/exam';

// Matches "3xam setting.png" - the entity's own real, factory defaults
// (ExamDefaults.cs), used by both the initial seed row and "Reset to
// Default" below (a client-side reset only - the Admin must still press
// Save Settings to persist it, same as changing any other field).
const FACTORY_DEFAULTS: Omit<ExamDefaultsResponse, 'updatedAtUtc'> = {
  defaultDurationMinutes: 60,
  passingScorePercent: 40,
  defaultMaxAttempts: 3,
  negativeMarkingEnabled: true,
  negativeMarkingValue: 0.25,
  autoSaveEnabled: true,
  autoSubmitEnabled: true,
  questionNavigationMode: 'Free',
  resultPublishingMode: 'Manual',
};

function SectionBar({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="d-flex align-items-center gap-2 px-3 py-3 rounded-3 mb-3" style={{ background: '#f5f5ff' }}>
      <div
        className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
        style={{ width: 36, height: 36, background: '#e0e7ff', color: '#4f46e5' }}
      >
        {icon}
      </div>
      <div>
        <div className="fw-bold">{title}</div>
        <div className="text-muted small">{subtitle}</div>
      </div>
    </div>
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

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export default function ExamSettingsPage() {
  const [settings, setSettings] = useState<ExamDefaultsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getExamDefaults()
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
      const updated = await updateExamDefaults(settings);
      setSettings(updated);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setSettings((prev) => (prev ? { ...prev, ...FACTORY_DEFAULTS } : prev));
  };

  const update = (patch: Partial<ExamDefaultsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <div className="d-flex align-items-start gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: '#ede9fe', color: '#7c3aed' }}
        >
          <GearIcon />
        </div>
        <div>
          <h1 className="h4 fw-bold mb-1">Exam Settings</h1>
          <p className="text-muted mb-0">
            Configure default exam behavior and assessment preferences. These settings will be used as default
            values for all newly created exams.
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {status === 'success' && (
            <Alert variant="success" className="py-2">
              Exam settings saved.
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="danger" className="py-2">
              Couldn't save exam settings. Please try again.
            </Alert>
          )}

          {status === 'loading' && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" />
            </div>
          )}

          {settings && (
            <>
              <SectionBar icon={<ClockIcon />} title="General Settings" subtitle="Set default duration, attempts and scoring behavior." />

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Default Exam Duration (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={settings.defaultDurationMinutes}
                      onChange={(e) => update({ defaultDurationMinutes: Number(e.target.value) })}
                    />
                    <Form.Text className="text-muted">Default time limit for a new exam.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Passing Score (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      max={100}
                      value={settings.passingScorePercent}
                      onChange={(e) => update({ passingScorePercent: Number(e.target.value) })}
                    />
                    <Form.Text className="text-muted">Minimum percentage to pass the exam.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Default Max Attempts</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={settings.defaultMaxAttempts}
                      onChange={(e) => update({ defaultMaxAttempts: Number(e.target.value) })}
                    />
                    <Form.Text className="text-muted">Number of attempts allowed per student.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Negative Marking Value</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.25}
                      value={settings.negativeMarkingValue}
                      onChange={(e) => update({ negativeMarkingValue: Number(e.target.value) })}
                      disabled={!settings.negativeMarkingEnabled}
                    />
                    <Form.Text className="text-muted">Marks to deduct for each wrong answer.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <SectionBar icon={<GearIcon />} title="Exam Behavior Options" subtitle="Configure additional behavior settings for the exam environment." />

              <Row className="mb-2">
                <Col md={6}>
                  <ToggleRow
                    label="Negative Marking"
                    description="Deduct marks for incorrect answers."
                    checked={settings.negativeMarkingEnabled}
                    onChange={(v) => update({ negativeMarkingEnabled: v })}
                    disabled={false}
                  />
                  <ToggleRow
                    label="Auto Submit"
                    description="Automatically submit the exam when time is over."
                    checked={settings.autoSubmitEnabled}
                    onChange={(v) => update({ autoSubmitEnabled: v })}
                    disabled={false}
                  />
                </Col>
                <Col md={6}>
                  <ToggleRow
                    label="Auto Save"
                    description="Automatically save answers while taking the exam."
                    checked={settings.autoSaveEnabled}
                    onChange={(v) => update({ autoSaveEnabled: v })}
                    disabled={false}
                  />
                </Col>
              </Row>

              <SectionBar icon={<ListIcon />} title="Other Preferences" subtitle="Set navigation and result publishing preferences." />

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Question Navigation</Form.Label>
                    <Form.Select
                      value={settings.questionNavigationMode}
                      onChange={(e) =>
                        update({ questionNavigationMode: e.target.value as ExamDefaultsResponse['questionNavigationMode'] })
                      }
                    >
                      <option value="Free">Free</option>
                      <option value="Sequential">Sequential</option>
                    </Form.Select>
                    <Form.Text className="text-muted">How students can navigate between questions.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Result Publishing</Form.Label>
                    <Form.Select
                      value={settings.resultPublishingMode}
                      onChange={(e) =>
                        update({ resultPublishingMode: e.target.value as ExamDefaultsResponse['resultPublishingMode'] })
                      }
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </Form.Select>
                    <Form.Text className="text-muted">When to show results to students.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
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
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
