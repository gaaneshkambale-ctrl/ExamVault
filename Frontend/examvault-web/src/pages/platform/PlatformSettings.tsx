import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import ToggleRow from '../../components/ToggleRow';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';
import { getPlatformSettings, updatePlatformSettings } from '../../api/platformSettingsApi';
import { extractServerError } from '../../utils/apiError';
import type { PlatformSettings as PlatformSettingsType, UpdatePlatformSettingsRequest } from '../../types/platformSettings';

// Matches setting.png's Platform Settings screen. General tab is now real -
// Platform Name/Tagline, Allow Self Registration, and Maintenance Mode are
// all backed by the new PlatformSettings entity and actually enforced
// (RegisterUserHandler for self-registration, LoginUserHandler for
// maintenance mode - see PlatformSettingsController.cs). Security
// Preferences here mirrors Security Settings' own Password
// Policy/Session Management fields (same underlying row, no drift between
// the two pages). Require Email Verification/Registration Approval stay
// honest placeholders - each needs a real new flow (an email-confirm link,
// or an approval queue + pending-user status) this pass doesn't build.
// Default Time Zone/Language stay as-is - only one option exists in either
// dropdown today, so there's nothing real to switch between yet. Every
// other tab stays "Not connected yet" - no fields were ever defined for
// them even in the original mockup.
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
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({ queryKey: ['platform-settings'], queryFn: getPlatformSettings });
  const { data: tenants } = useTenants();
  const { data: users } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const [tab, setTab] = useState('general');
  const [draft, setDraft] = useState<PlatformSettingsType | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (request: UpdatePlatformSettingsRequest) => updatePlatformSettings(request),
    onSuccess: (updated) => {
      queryClient.setQueryData(['platform-settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['platform-branding'] });
      setDraft(updated);
    },
  });

  const update = <K extends keyof PlatformSettingsType>(key: K, value: PlatformSettingsType[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = () => {
    if (!draft) return;
    const { updatedAtUtc: _updatedAtUtc, ...request } = draft;
    saveMutation.mutate(request);
  };

  return (
    <PlatformLayout active="settings-platform">
      <p className="text-muted small mb-1">Platform Admin / Settings / Platform Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Platform Settings</h1>
      <p className="text-muted mb-3">Configure global platform settings that apply to all organizations.</p>

      <SettingsDisclosure text="Platform Name/Tagline, Allow Self Registration, Maintenance Mode, and Security Preferences below are real and enforced. Require Email Verification and Registration Approval remain a visual reference - each needs a real new flow this pass doesn't build." />

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
                  <Col lg={8}>
                    <Card className="border-0 shadow-sm mb-3">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-3">General Settings</h2>
                        <Form.Group className="mb-3">
                          <Form.Label className="small text-muted">Platform Name</Form.Label>
                          <Form.Control
                            value={draft.platformName}
                            onChange={(e) => update('platformName', e.target.value)}
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label className="small text-muted">Platform Tagline</Form.Label>
                          <Form.Control
                            value={draft.platformTagline}
                            onChange={(e) => update('platformTagline', e.target.value)}
                            placeholder="Shown under the platform name on the sign-in screen"
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label className="small text-muted">Default Time Zone</Form.Label>
                          <Form.Select disabled defaultValue="ist">
                            <option value="ist">(UTC+05:30) Asia/Kolkata</option>
                          </Form.Select>
                          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                            No other time zone is available yet - nothing to switch between.
                          </div>
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
                          description="Allow new users to sign up on the platform"
                          checked={draft.allowSelfRegistration}
                          onChange={(v) => update('allowSelfRegistration', v)}
                          disabled={false}
                        />
                        <ToggleRow
                          label="Require Email Verification"
                          description="Users must verify their email address"
                        />
                        <ToggleRow
                          label="Maintenance Mode"
                          description="Blocks non-Super Admin logins with a maintenance message"
                          checked={draft.maintenanceModeEnabled}
                          onChange={(v) => update('maintenanceModeEnabled', v)}
                          disabled={false}
                        />
                        <ToggleRow
                          label="Enable Registration Approval"
                          description="New organizations require approval by Super Admin"
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
                            <span className="text-muted">Total Organizations</span>
                            <span>{tenants?.length ?? '—'}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Total Users</span>
                            <span>{users?.length ?? '—'}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Storage Used</span>
                            <span>—</span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-2">Security Preferences</h2>
                        <p className="text-muted" style={{ fontSize: 12 }}>
                          Same fields as Security Settings &gt; Password Policy/Session Management.
                        </p>
                        <ToggleRow
                          label="Require Uppercase, Lowercase &amp; Numbers"
                          checked={draft.passwordRequireUppercase && draft.passwordRequireLowercase && draft.passwordRequireDigit}
                          onChange={(v) => {
                            update('passwordRequireUppercase', v);
                            update('passwordRequireLowercase', v);
                            update('passwordRequireDigit', v);
                          }}
                          disabled={false}
                        />
                        <Form.Group className="py-2 border-bottom">
                          <Form.Label className="small text-muted mb-1">Session Timeout (Minutes)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            min={5}
                            max={1440}
                            value={draft.sessionTimeoutMinutes}
                            onChange={(e) => update('sessionTimeoutMinutes', Number(e.target.value))}
                          />
                        </Form.Group>
                        <Form.Group className="py-2 border-bottom">
                          <Form.Label className="small text-muted mb-1">Maximum Login Attempts</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            min={3}
                            max={20}
                            value={draft.maxLoginAttempts}
                            onChange={(e) => update('maxLoginAttempts', Number(e.target.value))}
                          />
                        </Form.Group>
                        <ToggleRow
                          label="Enable Two-Factor Authentication"
                          description="Allow 2FA for all platform users"
                        />
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
