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

// Matches setting.png's Security Settings screen. Password Policy and
// Session Management are now real - backed by the new PlatformSettings
// entity (see PlatformSettingsController.cs), actually enforced by
// RegisterUserValidator/ResetPasswordValidator/ChangePasswordValidator
// (password rules), LoginUserHandler (max login attempts -> lockout), and
// JwtTokenService (session timeout). Two-Factor Auth/IP Restrictions/
// Security Headers/Account Lockout(tab)/Device Management stay honest
// "Not connected yet" - each would be its own standalone feature (a real
// 2FA flow, IP allow-listing, security-header middleware, device
// fingerprinting), not something a settings toggle alone can turn on.
// Password Expiry/Prevent Reuse also stay disabled - enforcing those needs
// a password-history table this pass doesn't add.
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
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({ queryKey: ['platform-settings'], queryFn: getPlatformSettings });

  const [tab, setTab] = useState('password-policy');
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
    <PlatformLayout active="settings-security">
      <p className="text-muted small mb-1">Platform Admin / Settings / Security Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Security Settings</h1>
      <p className="text-muted mb-3">Configure security policies and access controls.</p>

      <SettingsDisclosure text="Password Policy and Session Management below are real and enforced on every login/register/password-change request. Two-Factor Auth, IP Restrictions, Security Headers, the Account Lockout tab, and Device Management remain a visual reference - none of those have a real backend behind them yet." />

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load settings. Please try again.</div>}

      {!isLoading && !isError && draft && (
        <Row className="g-3">
          <Col lg={2}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-2">
                <SettingsTabNav tabs={TABS} active={tab} onSelect={setTab} />
              </Card.Body>
            </Card>
          </Col>

          <Col lg={10}>
            {tab !== 'password-policy' && tab !== 'session-management' && (
              <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />
            )}

            {tab === 'password-policy' && (
              <Row className="g-3">
                <Col lg={5}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <h2 className="h6 fw-bold mb-3">Password Policy</h2>
                      <Form.Group className="mb-3">
                        <Form.Label className="small text-muted">Minimum Password Length</Form.Label>
                        <Form.Control
                          type="number"
                          min={6}
                          max={64}
                          value={draft.passwordMinLength}
                          onChange={(e) => update('passwordMinLength', Number(e.target.value))}
                        />
                      </Form.Group>
                      <ToggleRow
                        label="Require Uppercase Letters"
                        checked={draft.passwordRequireUppercase}
                        onChange={(v) => update('passwordRequireUppercase', v)}
                        disabled={false}
                      />
                      <ToggleRow
                        label="Require Lowercase Letters"
                        checked={draft.passwordRequireLowercase}
                        onChange={(v) => update('passwordRequireLowercase', v)}
                        disabled={false}
                      />
                      <ToggleRow
                        label="Require Numbers"
                        checked={draft.passwordRequireDigit}
                        onChange={(v) => update('passwordRequireDigit', v)}
                        disabled={false}
                      />
                      <ToggleRow
                        label="Require Special Characters"
                        checked={draft.passwordRequireSpecialChar}
                        onChange={(v) => update('passwordRequireSpecialChar', v)}
                        disabled={false}
                      />
                      <Form.Group className="mt-3 mb-3">
                        <Form.Label className="small text-muted">Password Expiry</Form.Label>
                        <Form.Select disabled defaultValue="90">
                          <option value="90">90 Days</option>
                        </Form.Select>
                        <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                          Not connected yet - needs a password-history table.
                        </div>
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
                      <h2 className="h6 fw-bold mb-2">Account Lockout</h2>
                      <Form.Group className="mb-3">
                        <Form.Label className="small text-muted">Maximum Login Attempts</Form.Label>
                        <Form.Control
                          type="number"
                          min={3}
                          max={20}
                          value={draft.maxLoginAttempts}
                          onChange={(e) => update('maxLoginAttempts', Number(e.target.value))}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Label className="small text-muted">Lockout Duration (Minutes)</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={1440}
                          value={draft.lockoutMinutes}
                          onChange={(e) => update('lockoutMinutes', Number(e.target.value))}
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>

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

            {tab === 'session-management' && (
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Session Management</h2>
                  <p className="text-muted small mb-3">
                    Controls how long a login stays valid before requiring a fresh sign-in. Applies on the next
                    login or token refresh, not to sessions already in progress.
                  </p>
                  <Form.Group style={{ maxWidth: 320 }}>
                    <Form.Label className="small text-muted">Session Timeout (Minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      min={5}
                      max={1440}
                      value={draft.sessionTimeoutMinutes}
                      onChange={(e) => update('sessionTimeoutMinutes', Number(e.target.value))}
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
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
          </Col>
        </Row>
      )}
    </PlatformLayout>
  );
}
