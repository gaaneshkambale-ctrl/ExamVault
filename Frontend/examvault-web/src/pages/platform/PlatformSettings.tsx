import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';

// Matches setting.png's Platform Settings screen. Visual shell only, per
// user's explicit choice - there is no PlatformSettings entity or config
// store anywhere in this codebase (unlike Users/Orgs/Exams, which already
// existed as real domain data before this console was built). Every
// input/toggle below is disabled and pre-filled with the mockup's
// illustrative example values, same treatment as Subscription Plans'
// static pricing cards. "About Platform" stat fields (Total
// Organizations/Total Users/Storage Used) are shown as "-" rather than
// the mockup's fake numbers - those specifically look like live metrics,
// and this project's convention is to never show a fabricated number
// that could be mistaken for real data.
const TABS = [
  { key: 'general', label: 'General' },
  { key: 'branding', label: 'Branding' },
  { key: 'features', label: 'Features' },
  { key: 'exam-settings', label: 'Exam Settings' },
  { key: 'content-media', label: 'Content & Media' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'system-maintenance', label: 'System Maintenance' },
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

export default function PlatformSettings() {
  const [tab, setTab] = useState('general');

  return (
    <PlatformLayout active="settings-platform">
      <p className="text-muted small mb-1">Platform Admin / Settings / Platform Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Platform Settings</h1>
      <p className="text-muted mb-3">Configure global platform settings that apply to all organizations.</p>

      <SettingsDisclosure text="This page is a visual reference for the settings that would apply platform-wide - there's no PlatformSettings backend yet, so every control below is disabled." />

      <Row className="g-3">
        <Col lg={2}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-2">
              <SettingsTabNav tabs={TABS} active={tab} onSelect={setTab} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={10}>
          {tab !== 'general' && <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />}

          {tab === 'general' && (
            <Row className="g-3">
              <Col lg={8}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">General Settings</h2>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Platform Name</Form.Label>
                      <Form.Control defaultValue="ExamVault" disabled />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Platform Tagline</Form.Label>
                      <Form.Control defaultValue="Smarter Exams. Better Results." disabled />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Default Time Zone</Form.Label>
                      <Form.Select disabled defaultValue="ist">
                        <option value="ist">(UTC+05:30) Asia/Kolkata</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label className="small text-muted">Default Language</Form.Label>
                      <Form.Select disabled defaultValue="en">
                        <option value="en">English</option>
                      </Form.Select>
                    </Form.Group>
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">System Preferences</h2>
                    <ToggleRow
                      label="Allow Self Registration"
                      description="Allow new organizations to sign up on the platform"
                      defaultChecked
                    />
                    <ToggleRow
                      label="Require Email Verification"
                      description="Users must verify their email address"
                      defaultChecked
                    />
                    <ToggleRow label="Maintenance Mode" description="Enable to put the platform in maintenance mode" />
                    <ToggleRow
                      label="Enable Registration Approval"
                      description="New organizations require approval by Super Admin"
                      defaultChecked
                    />
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">About Platform</h2>
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Platform Version</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Environment</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Total Organizations</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Total Users</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Storage Used</span>
                        <span>—</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Support Email</span>
                        <span>—</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">Security Preferences</h2>
                    <ToggleRow label="Enforce Strong Password" description="Require strong passwords for all users" defaultChecked />
                    <Form.Group className="py-2 border-bottom">
                      <Form.Label className="small text-muted mb-1">Session Timeout (Minutes)</Form.Label>
                      <Form.Control type="number" defaultValue={30} disabled size="sm" />
                    </Form.Group>
                    <Form.Group className="py-2 border-bottom">
                      <Form.Label className="small text-muted mb-1">Maximum Login Attempts</Form.Label>
                      <Form.Control type="number" defaultValue={5} disabled size="sm" />
                    </Form.Group>
                    <ToggleRow
                      label="Enable Two-Factor Authentication"
                      description="Allow 2FA for all platform users"
                      defaultChecked
                    />
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
