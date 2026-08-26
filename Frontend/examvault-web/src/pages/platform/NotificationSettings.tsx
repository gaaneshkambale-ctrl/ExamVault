import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';

// Matches setting.png's Notification Settings screen. Visual shell only -
// there's no platform-wide notification-preference config in this
// codebase (each user has their own real per-user notification
// preferences elsewhere in the app, but nothing at this "Super Admin
// configures defaults for everyone" level). The Notification Types list's
// Enabled/Disabled badges are the mockup's illustrative example state,
// not a live status - the whole page sits under the disclosure banner
// making that clear.
const TABS = [
  { key: 'general', label: 'General' },
  { key: 'in-app', label: 'In-App Notifications' },
  { key: 'email', label: 'Email Notifications' },
  { key: 'sms', label: 'SMS Notifications' },
  { key: 'templates', label: 'Notification Templates' },
];

const NOTIFICATION_TYPES = [
  { name: 'Exam Assigned', channels: 'In-App, Email', enabled: true },
  { name: 'Exam Reminder', channels: 'In-App, Email, SMS', enabled: true },
  { name: 'Result Published', channels: 'In-App, Email', enabled: true },
  { name: 'New Message', channels: 'In-App, Email', enabled: true },
  { name: 'System Alerts', channels: 'In-App, Email, SMS', enabled: true },
  { name: 'Marketing', channels: 'Email', enabled: false },
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

export default function NotificationSettings() {
  const [tab, setTab] = useState('general');

  return (
    <PlatformLayout active="settings-notifications">
      <p className="text-muted small mb-1">Platform Admin / Settings / Notification Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Notification Settings</h1>
      <p className="text-muted mb-3">Manage notification preferences and delivery settings.</p>

      <SettingsDisclosure text="This page is a visual reference for platform-wide notification defaults - there's no such config in this codebase yet, so every control below is disabled." />

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
              <Col lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-2">General Notification Settings</h2>
                    <ToggleRow label="Enable In-App Notifications" description="Allow in-app notifications for all users" defaultChecked />
                    <ToggleRow label="Enable Email Notifications" description="Send email notifications to users" defaultChecked />
                    <ToggleRow label="Enable SMS Notifications" description="Send SMS notifications to users" defaultChecked />
                    <ToggleRow label="Do Not Disturb (DND)" description="Allow users to enable Do Not Disturb" />
                    <ToggleRow label="Digest Notifications" description="Send digest of notifications at a specific time" defaultChecked />
                    <Row className="g-3 mt-1">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Digest Frequency</Form.Label>
                          <Form.Select disabled defaultValue="daily">
                            <option value="daily">Daily</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Digest Time</Form.Label>
                          <Form.Control defaultValue="08:00 AM" disabled />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Notification Types</h2>
                    <div className="d-flex flex-column gap-2">
                      {NOTIFICATION_TYPES.map((type) => (
                        <div key={type.name} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                          <div>
                            <div className="small fw-medium">{type.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {type.channels}
                            </div>
                          </div>
                          <Badge bg={type.enabled ? 'success' : 'secondary'} className="bg-opacity-25 text-dark border">
                            {type.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      ))}
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
