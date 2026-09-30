import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';
import { getPlatformSettings, updatePlatformSettings } from '../../api/platformSettingsApi';
import { extractServerError } from '../../utils/apiError';
import type { PlatformSettings, UpdatePlatformSettingsRequest } from '../../types/platformSettings';

// Matches setting.png's Tenant Settings screen. Trial Duration is real -
// it pre-fills StartTrialButton's date picker (still fully overridable
// per-org). Default Limits' Max Users/Max Exams inputs were removed
// entirely (2026-09-05): CreateTenantHandler was changed to seed every new
// tenant's limits from its assigned Plan instead, so these PlatformSettings
// fields stopped being read there - keeping them in the UI falsely implied
// they still did something. Max Students stays, but honestly disclosed as
// not enforced (same underlying reason - Plan owns it now). Max Storage
// stays honest "not enforced" too - nothing in this codebase tracks
// per-tenant storage usage, so a limit on it would have nothing real to
// check against. Default Features toggles are dropped entirely - this
// session already built real, enforced Plan-based feature gating
// (Subscriptions > Plans); a second "tenant-default" toggle layer over the
// same concepts would conflict with it rather than add anything real.
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

function limitToInput(value: number | null): string {
  return value === null ? '' : String(value);
}

function inputToLimit(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Math.max(1, Number(trimmed));
}

export default function TenantSettings() {
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
    <PlatformLayout active="settings-tenant">
      <p className="text-muted small mb-1">Platform Admin / Settings / Tenant Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Tenant Settings</h1>
      <p className="text-muted mb-3">Manage default settings for new organizations (tenants).</p>

      <SettingsDisclosure text="Trial Duration below is real - applied to every newly created organization. Max Users/Max Exams limits now come from each organization's assigned Plan (Subscriptions > Plans), not from defaults here. Max Students, Max Storage, and Default Features stay a visual reference (Max Students and Max Storage aren't enforced, and feature gating is already handled for real by Subscriptions > Plans)." />

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
                  <Col lg={5}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-3">Default Tenant Settings</h2>
                        <Form.Group className="mb-3">
                          <Form.Label className="small text-muted">Default Time Zone</Form.Label>
                          <Form.Select disabled defaultValue="ist">
                            <option value="ist">(UTC+05:30) Asia/Kolkata</option>
                          </Form.Select>
                          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                            No other time zone is available yet.
                          </div>
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
                        <p className="text-muted" style={{ fontSize: 12 }}>
                          Max Users/Max Exams moved to each organization's assigned Plan (Subscriptions &gt; Plans) -
                          set them there instead.
                        </p>
                        <Form.Group className="mb-3">
                          <Form.Label className="small text-muted">Max Students</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            placeholder="Unlimited"
                            value={limitToInput(draft.defaultMaxStudents)}
                            onChange={(e) => update('defaultMaxStudents', inputToLimit(e.target.value))}
                          />
                          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                            Stored for a future per-role breakdown - not enforced yet.
                          </div>
                        </Form.Group>
                        <Form.Group>
                          <Form.Label className="small text-muted">Max Storage</Form.Label>
                          <Form.Control disabled placeholder="Not tracked" />
                        </Form.Group>
                        <Form.Group className="mt-3">
                          <Form.Label className="small text-muted">Trial Duration (Days)</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            max={365}
                            value={draft.defaultTrialDurationDays}
                            onChange={(e) => update('defaultTrialDurationDays', Number(e.target.value))}
                          />
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={4}>
                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-2">About Tenants</h2>
                        <p className="text-muted small">
                          Trial Duration applies to newly created organizations. User/exam limits are set per
                          organization via its assigned Plan (Subscriptions &gt; Plans), not here.
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
                        <p className="text-muted small mb-2">
                          Already handled for real by Subscriptions &gt; Plans - a second toggle layer here would
                          conflict with it rather than add anything real.
                        </p>
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
