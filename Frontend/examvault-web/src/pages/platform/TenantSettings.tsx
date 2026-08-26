import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';

// Matches setting.png's Tenant Settings screen. Visual shell only - same
// reasoning as PlatformSettings.tsx, there's no concept of "default
// settings applied to newly created organizations" in this codebase.
const TABS = [
  { key: 'general', label: 'General' },
  { key: 'features', label: 'Features' },
  { key: 'exam-settings', label: 'Exam Settings' },
  { key: 'subscription-limits', label: 'Subscription Limits' },
  { key: 'theme-branding', label: 'Theme & Branding' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'data-retention', label: 'Data Retention' },
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

export default function TenantSettings() {
  const [tab, setTab] = useState('general');

  return (
    <PlatformLayout active="settings-tenant">
      <p className="text-muted small mb-1">Platform Admin / Settings / Tenant Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Tenant Settings</h1>
      <p className="text-muted mb-3">Manage default settings for new organizations (tenants).</p>

      <SettingsDisclosure text="This page is a visual reference for default new-tenant settings - there's no backend concept of tenant defaults yet, so every control below is disabled." />

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
              <Col lg={5}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Default Tenant Settings</h2>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Default Time Zone</Form.Label>
                      <Form.Select disabled defaultValue="ist">
                        <option value="ist">(UTC+05:30) Asia/Kolkata</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Date Format</Form.Label>
                      <Form.Select disabled defaultValue="ddmmmyyyy">
                        <option value="ddmmmyyyy">DD MMM YYYY</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Time Format</Form.Label>
                      <Form.Select disabled defaultValue="12h">
                        <option value="12h">12 Hour (hh:mm AM/PM)</option>
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
              </Col>

              <Col lg={3}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Default Limits</h2>
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Max Users</span>
                        <span>100</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Max Exams</span>
                        <span>50</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Max Students</span>
                        <span>500</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Max Storage</span>
                        <span>10 GB</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Trial Duration</span>
                        <span>15 Days</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">About Tenants</h2>
                    <p className="text-muted small">
                      Those settings will be applied to all newly created organizations. Existing organizations can
                      configure these settings individually.
                    </p>
                    <h2 className="h6 fw-bold mb-2 mt-3">Need Help?</h2>
                    <p className="text-muted small mb-1">Learn how tenant settings work</p>
                    <span className="small text-decoration-none text-muted" style={{ cursor: 'not-allowed' }}>
                      View Documentation
                    </span>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={12}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">Default Features</h2>
                    <ToggleRow label="Allow Self Registration" description="Allow organizations to sign up" defaultChecked />
                    <ToggleRow
                      label="Enable Email Notifications"
                      description="Send email notifications to users"
                      defaultChecked
                    />
                    <ToggleRow label="Enable SMS Notifications" description="Send SMS notifications to users" defaultChecked />
                    <ToggleRow
                      label="Enable Result Publishing"
                      description="Allow organizations to publish results"
                      defaultChecked
                    />
                    <ToggleRow label="Enable Question Bank" description="Allow organizations to use question bank" defaultChecked />
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
