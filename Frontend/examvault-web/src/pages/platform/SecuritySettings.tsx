import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';

// Matches setting.png's Security Settings screen. Visual shell only -
// there's no platform-wide security-policy engine in this codebase (no
// enforced password-complexity rules, no 2FA, no configurable lockout
// policy). Security Score and Last Security Review are dropped down to
// "-" rather than the mockup's fake "85/100 Good" - that specifically
// looks like a computed live metric. Active Security Features keeps the
// mockup's feature list but drops the misleading "Enabled" status badges
// (nothing here is actually enabled/enforced today).
const TABS = [
  { key: 'password-policy', label: 'Password Policy' },
  { key: 'two-factor', label: 'Two-Factor Auth' },
  { key: 'session-management', label: 'Session Management' },
  { key: 'ip-restrictions', label: 'IP Restrictions' },
  { key: 'security-headers', label: 'Security Headers' },
  { key: 'account-lockout', label: 'Account Lockout' },
  { key: 'device-management', label: 'Device Management' },
];

const ACTIVE_FEATURES = [
  'Two-Factor Authentication',
  'Account Lockout',
  'Password Policy',
  'HTTPS Enforcement',
  'Security Headers',
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

export default function SecuritySettings() {
  const [tab, setTab] = useState('password-policy');

  return (
    <PlatformLayout active="settings-security">
      <p className="text-muted small mb-1">Platform Admin / Settings / Security Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Security Settings</h1>
      <p className="text-muted mb-3">Configure security policies and access controls.</p>

      <SettingsDisclosure text="This page is a visual reference for a platform-wide security policy - there's no enforcement engine behind it in this codebase yet, so every control below is disabled." />

      <Row className="g-3">
        <Col lg={2}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-2">
              <SettingsTabNav tabs={TABS} active={tab} onSelect={setTab} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={10}>
          {tab !== 'password-policy' && <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />}

          {tab === 'password-policy' && (
            <Row className="g-3">
              <Col lg={5}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Password Policy</h2>
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">Minimum Password Length</Form.Label>
                      <Form.Control defaultValue="8" disabled />
                    </Form.Group>
                    <ToggleRow label="Require Uppercase Letters" defaultChecked />
                    <ToggleRow label="Require Lowercase Letters" defaultChecked />
                    <ToggleRow label="Require Numbers" defaultChecked />
                    <ToggleRow label="Require Special Characters" />
                    <Form.Group className="mt-3 mb-3">
                      <Form.Label className="small text-muted">Password Expiry</Form.Label>
                      <Form.Select disabled defaultValue="90">
                        <option value="90">90 Days</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label className="small text-muted">Prevent Password Reuse</Form.Label>
                      <Form.Select disabled defaultValue="5">
                        <option value="5">Last 5 Passwords</option>
                      </Form.Select>
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">Two-Factor Authentication</h2>
                    <ToggleRow label="Require 2FA for Admins" defaultChecked />
                    <ToggleRow label="Require 2FA for Organization Admins" />
                    <ToggleRow label="Require 2FA for All Users" />
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">Security Overview</h2>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Security Score</span>
                      <span>—</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Last Security Review</span>
                      <span>—</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Active Security Features</h2>
                    <ul className="list-unstyled small mb-0">
                      {ACTIVE_FEATURES.map((feature) => (
                        <li key={feature} className="d-flex justify-content-between py-1 border-bottom">
                          <span>{feature}</span>
                          <span className="text-muted">—</span>
                        </li>
                      ))}
                    </ul>
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
