import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { getExamDefaults, updateExamDefaults } from '../../../api/examApi';
import type { ExamDefaultsResponse } from '../../../types/exam';

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

  const update = (patch: Partial<ExamDefaultsResponse>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout active="Settings">
      <Link to="/admin/settings" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Settings
      </Link>
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Settings</h1>
      <p className="text-muted mb-4">Configure default exam behavior and assessment preferences.</p>
      <p className="text-muted small mb-4" style={{ maxWidth: 640 }}>
        These are default values only - they don't yet prefill the Create Exam form automatically.
      </p>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 640 }}>
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
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Default Exam Duration (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={settings.defaultDurationMinutes}
                      onChange={(e) => update({ defaultDurationMinutes: Number(e.target.value) })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Passing Score (%)</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      max={100}
                      value={settings.passingScorePercent}
                      onChange={(e) => update({ passingScorePercent: Number(e.target.value) })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Default Max Attempts</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={settings.defaultMaxAttempts}
                      onChange={(e) => update({ defaultMaxAttempts: Number(e.target.value) })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Negative Marking Value</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.25}
                      value={settings.negativeMarkingValue}
                      onChange={(e) => update({ negativeMarkingValue: Number(e.target.value) })}
                      disabled={!settings.negativeMarkingEnabled}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Check
                type="checkbox"
                id="negativeMarkingEnabled"
                label="Negative Marking"
                checked={settings.negativeMarkingEnabled}
                onChange={(e) => update({ negativeMarkingEnabled: e.target.checked })}
                className="mb-2"
              />
              <Form.Check
                type="checkbox"
                id="autoSaveEnabled"
                label="Auto Save"
                checked={settings.autoSaveEnabled}
                onChange={(e) => update({ autoSaveEnabled: e.target.checked })}
                className="mb-2"
              />
              <Form.Check
                type="checkbox"
                id="autoSubmitEnabled"
                label="Auto Submit"
                checked={settings.autoSubmitEnabled}
                onChange={(e) => update({ autoSubmitEnabled: e.target.checked })}
                className="mb-3"
              />

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Question Navigation</Form.Label>
                    <Form.Select
                      value={settings.questionNavigationMode}
                      onChange={(e) =>
                        update({ questionNavigationMode: e.target.value as ExamDefaultsResponse['questionNavigationMode'] })
                      }
                    >
                      <option value="Free">Free</option>
                      <option value="Sequential">Sequential</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Result Publishing</Form.Label>
                    <Form.Select
                      value={settings.resultPublishingMode}
                      onChange={(e) =>
                        update({ resultPublishingMode: e.target.value as ExamDefaultsResponse['resultPublishingMode'] })
                      }
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

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
