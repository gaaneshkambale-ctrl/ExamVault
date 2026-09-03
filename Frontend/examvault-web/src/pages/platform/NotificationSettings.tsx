import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';
import { getPlatformSettings, updatePlatformSettings } from '../../api/platformSettingsApi';
import { extractServerError } from '../../utils/apiError';
import type { PlatformSettings, UpdatePlatformSettingsRequest } from '../../types/platformSettings';

// Matches setting.png's Notification Settings screen. Enable In-App/Email
// Notifications are now real platform-wide defaults - applied by
// NotificationService's GetMyPreferencesHandler whenever a user has never
// explicitly set their own preference for a given notification type
// (existing users' own choices are never touched). Enable SMS Notifications
// stays honest/disabled - NotificationPreference has no SMS field anywhere
// in the schema, there's no channel to toggle. Do Not Disturb/Digest
// Notifications/the Notification Types list's per-type Enabled/Disabled
// badges stay the mockup's illustrative example - a real digest/batching
// system and a cross-tenant per-type usage breakdown are each their own
// separate feature this pass doesn't build.
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
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({ queryKey: ['platform-settings'], queryFn: getPlatformSettings });

  const [tab, setTab] = useState('general');
  const [draft, setDraft] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (request: UpdatePlatformSettingsRequest) => updatePlatformSettings(request),
    onSuccess: (updated) => {
      queryClient.setQueryData(['platform-settings'], updated);
      setDraft(updated);
    },
  });

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = () => {
    if (!draft) return;
    const { updatedAtUtc: _updatedAtUtc, ...request } = draft;
    saveMutation.mutate(request);
  };

  return (
    <PlatformLayout active="settings-notifications">
      <p className="text-muted small mb-1">Platform Admin / Settings / Notification Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Notification Settings</h1>
      <p className="text-muted mb-3">Manage notification preferences and delivery settings.</p>

      <SettingsDisclosure text="Enable In-App/Email Notifications below are real platform-wide defaults, applied whenever a new notification type has no explicit per-user preference saved yet - existing users' own choices are never overridden. Enable SMS Notifications, Do Not Disturb, Digest Notifications, and the Notification Types list stay a visual reference - there's no SMS channel, digest system, or per-type usage tracking anywhere in this codebase." />

      <Row className="g-3">
        <Col lg={2}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-2">
              <SettingsTabNav tabs={TABS} active={tab} onSelect={setTab} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={10}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load settings. Please try again.</div>}

          {!isLoading && !isError && draft && (
            <>
              {tab !== 'general' && <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />}

              {tab === 'general' && (
                <Row className="g-3">
                  <Col lg={6}>
                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-2">General Notification Settings</h2>
                        <ToggleRow
                          label="Enable In-App Notifications"
                          description="Default for users with no explicit preference set"
                          checked={draft.defaultInAppNotificationsEnabled}
                          onChange={(v) => update('defaultInAppNotificationsEnabled', v)}
                          disabled={false}
                        />
                        <ToggleRow
                          label="Enable Email Notifications"
                          description="Default for users with no explicit preference set"
                          checked={draft.defaultEmailNotificationsEnabled}
                          onChange={(v) => update('defaultEmailNotificationsEnabled', v)}
                          disabled={false}
                        />
                        <ToggleRow label="Enable SMS Notifications" description="No SMS channel exists yet" />
                        <ToggleRow label="Do Not Disturb (DND)" description="Allow users to enable Do Not Disturb" />
                        <ToggleRow
                          label="Digest Notifications"
                          description="Send digest of notifications at a specific time"
                          defaultChecked
                        />
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
                        <p className="text-muted" style={{ fontSize: 12 }}>
                          Illustrative example - not a live per-type usage breakdown.
                        </p>
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

              {saveMutation.isError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {extractServerError(saveMutation.error)}
                </Alert>
              )}
              {saveMutation.isSuccess && !saveMutation.isError && (
                <Alert variant="success" className="mt-3 mb-0 py-2">
                  Settings saved.
                </Alert>
              )}

              <div className="mt-3">
                <Button variant="primary" disabled={saveMutation.isPending} onClick={save}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </Col>
      </Row>
    </PlatformLayout>
  );
}
