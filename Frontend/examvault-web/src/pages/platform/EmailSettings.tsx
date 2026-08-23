import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';

// Matches setting.png's Email Settings screen. Visual shell only - there's
// no SMTP/email-provider config anywhere in this codebase (the
// Notification Service sends emails via its own fixed configuration, not
// a Super-Admin-editable one). Connection Status and the Email Summary
// stats (Emails Sent/Delivered/Delivery Rate/Failed) are shown as "not
// connected" / "-" rather than the mockup's fake numbers and green
// "Connected" badge, since those specifically look like live status,
// not illustrative defaults.
const TABS = [
  { key: 'smtp', label: 'SMTP Server' },
  { key: 'templates', label: 'Email Templates' },
  { key: 'signature', label: 'Email Signature' },
  { key: 'test', label: 'Test Email' },
];

function NotBuiltPanel({ label }: { label: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h2 className="h6 fw-bold mb-3">{label}</h2>
        <div className="text-center text-muted small py-5">Not connected yet.</div>
      </Card.Body>
    </Card>
  );
}

export default function EmailSettings() {
  const [tab, setTab] = useState('smtp');

  return (
    <PlatformLayout active="settings-email">
      <p className="text-muted small mb-1">Platform Admin / Settings / Email Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Email Settings</h1>
      <p className="text-muted mb-3">Configure email settings for system and notifications.</p>

      <SettingsDisclosure text="This page is a visual reference for platform-wide SMTP configuration - there's no editable email-provider config in this codebase yet, so every control below is disabled." />

      <Row className="g-3">
        <Col lg={2}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-2">
              <SettingsTabNav tabs={TABS} active={tab} onSelect={setTab} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={10}>
          {tab !== 'smtp' && <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />}

          {tab === 'smtp' && (
            <Row className="g-3">
              <Col lg={7}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">SMTP Configuration</h2>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">SMTP Host</Form.Label>
                          <Form.Control defaultValue="smtp.sendgrid.net" disabled />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">SMTP Port</Form.Label>
                          <Form.Control defaultValue="587" disabled />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Encryption</Form.Label>
                          <Form.Select disabled defaultValue="starttls">
                            <option value="starttls">STARTTLS</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">From Email</Form.Label>
                          <Form.Control defaultValue="no-reply@examvault.com" disabled />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">From Name</Form.Label>
                          <Form.Control defaultValue="ExamVault" disabled />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Username</Form.Label>
                          <Form.Control defaultValue="apikey" disabled />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Password / API Key</Form.Label>
                          <Form.Control type="password" defaultValue="examplekey" disabled />
                          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                            Illustrative example only - using SendGrid SMTP.
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">Test Email</h2>
                    <p className="text-muted small">Send a test email to verify your settings.</p>
                    <div className="d-flex gap-2">
                      <Form.Control placeholder="Enter email address" disabled />
                      <Button variant="primary" disabled title="Not connected yet" className="text-nowrap">
                        Send Test Email
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Connection Status</h2>
                    <Badge bg="light" text="muted" className="border mb-2">
                      Not connected yet
                    </Badge>
                    <div className="text-muted small">No live SMTP connection check is wired up.</div>
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Email Summary</h2>
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Emails Sent (Today)</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Emails Delivered</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Delivery Rate</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Emails Failed</span>
                        <span>—</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <div className="mt-3">
            <Button variant="primary" disabled title="Not connected yet">
              Save Changes
            </Button>
          </div>
        </Col>
      </Row>
    </PlatformLayout>
  );
}
