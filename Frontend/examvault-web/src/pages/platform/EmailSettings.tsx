import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SettingsTabNav from '../../components/SettingsTabNav';
import SettingsDisclosure from '../../components/SettingsDisclosure';
import {
  getEmailConnectionStatus,
  getEmailSummary,
  getPlatformSettings,
  sendTestEmail,
  updatePlatformSettings,
  type EmailConnectionStatusValue,
} from '../../api/platformSettingsApi';
import { extractServerError } from '../../utils/apiError';
import type { PlatformSettings, UpdatePlatformSettingsRequest } from '../../types/platformSettings';

// Matches setting.png's Email Settings screen, reframed around the real
// dispatch mechanism instead of the mockup's SMTP fields - this platform
// doesn't send email via SMTP at all, only via a single n8n webhook
// (N8nEmailDispatcher). The Webhook URL below is real: it overrides the
// account-invite/credential email path specifically (UserService's own
// N8nEmailDispatcher) - NotificationService's separate notify webhook
// (exam reminders, results published, etc.) still only reads its own
// static appsettings config, not this field, so this doesn't control ALL
// platform email. Send Test Email is real. Connection Status is a real
// HEAD-request reachability probe against the configured webhook (never a
// real send). Email Summary is a real count of today's send attempts,
// summed across BOTH n8n dispatchers (this one plus NotificationService's
// separate copy) via a cross-service call. Templates/Signature stay honest
// placeholders - no template-editing concept exists anywhere.
const CONNECTION_STATUS_LABEL: Record<EmailConnectionStatusValue, { label: string; variant: string }> = {
  NotConfigured: { label: 'Not configured', variant: 'secondary' },
  Reachable: { label: 'Reachable', variant: 'success' },
  Unreachable: { label: 'Unreachable', variant: 'danger' },
};
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
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({ queryKey: ['platform-settings'], queryFn: getPlatformSettings });

  const [tab, setTab] = useState('smtp');
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');

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

  const testEmailMutation = useMutation({
    mutationFn: (toEmail: string) => sendTestEmail(toEmail),
  });

  const connectionStatusMutation = useMutation({
    mutationFn: () => getEmailConnectionStatus(),
  });

  const { data: emailSummary, isLoading: isSummaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['email-summary'],
    queryFn: getEmailSummary,
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
    <PlatformLayout active="settings-email">
      <p className="text-muted small mb-1">Platform Admin / Settings / Email Settings</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Email Settings</h1>
      <p className="text-muted mb-3">Configure email settings for system and notifications.</p>

      <SettingsDisclosure text="This platform sends email via a single n8n webhook, not SMTP - the Webhook URL below is real and overrides account-invite emails specifically (not every notification email in the system). Send Test Email genuinely sends through it. Connection Status is a real reachability check against the configured webhook. Email Summary is a real count of today's send attempts, combined across this webhook and NotificationService's separate one. Templates and Signature stay a visual reference - no template-editing concept exists anywhere." />

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
              {tab !== 'smtp' && <NotBuiltPanel label={TABS.find((t) => t.key === tab)?.label ?? ''} />}

              {tab === 'smtp' && (
                <Row className="g-3">
                  <Col lg={7}>
                    <Card className="border-0 shadow-sm mb-3">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-3">Notification Webhook</h2>
                        <Form.Group>
                          <Form.Label className="small text-muted">N8n Webhook URL</Form.Label>
                          <Form.Control
                            value={draft.n8nWebhookUrl ?? ''}
                            onChange={(e) => update('n8nWebhookUrl', e.target.value)}
                            placeholder="https://your-n8n-instance/webhook/..."
                          />
                          <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                            Overrides where account-invite emails are sent. Leave blank to use the server's
                            default configuration.
                          </div>
                        </Form.Group>
                      </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-2">Test Email</h2>
                        <p className="text-muted small">Send a test email to verify your current webhook configuration.</p>
                        <div className="d-flex gap-2">
                          <Form.Control
                            placeholder="Enter email address"
                            value={testEmailAddress}
                            onChange={(e) => setTestEmailAddress(e.target.value)}
                          />
                          <Button
                            variant="primary"
                            className="text-nowrap"
                            disabled={!testEmailAddress.trim() || testEmailMutation.isPending}
                            onClick={() => testEmailMutation.mutate(testEmailAddress.trim())}
                          >
                            {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                          </Button>
                        </div>
                        {testEmailMutation.isError && (
                          <Alert variant="danger" className="mt-3 mb-0 py-2">
                            {extractServerError(testEmailMutation.error)}
                          </Alert>
                        )}
                        {testEmailMutation.isSuccess && (
                          <Alert variant="success" className="mt-3 mb-0 py-2">
                            Test email sent to {testEmailAddress}.
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={5}>
                    <Card className="border-0 shadow-sm mb-3">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-3">Connection Status</h2>
                        {connectionStatusMutation.data ? (
                          <Badge bg={CONNECTION_STATUS_LABEL[connectionStatusMutation.data.status].variant} className="mb-2">
                            {CONNECTION_STATUS_LABEL[connectionStatusMutation.data.status].label}
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="mb-2">
                            Not checked yet
                          </Badge>
                        )}
                        <div className="text-muted small mb-2">
                          {connectionStatusMutation.data?.status === 'NotConfigured'
                            ? 'No webhook URL is configured.'
                            : 'A HEAD request to the configured webhook - never a real send.'}
                        </div>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={connectionStatusMutation.isPending}
                          onClick={() => connectionStatusMutation.mutate()}
                        >
                          {connectionStatusMutation.isPending ? 'Checking...' : 'Check Connection'}
                        </Button>
                        {connectionStatusMutation.isError && (
                          <Alert variant="danger" className="mt-2 mb-0 py-2">
                            {extractServerError(connectionStatusMutation.error)}
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h2 className="h6 fw-bold mb-3">Email Summary</h2>
                        {isSummaryLoading && (
                          <div className="d-flex justify-content-center py-3">
                            <Spinner animation="border" size="sm" />
                          </div>
                        )}
                        {isSummaryError && <div className="text-danger small">Couldn't load today's email summary.</div>}
                        {!isSummaryLoading && !isSummaryError && emailSummary && (
                          <div className="d-flex flex-column gap-2 small">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Emails Sent (Today)</span>
                              <span>{emailSummary.sentToday}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Emails Delivered</span>
                              <span>{emailSummary.deliveredToday}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Delivery Rate</span>
                              <span>{emailSummary.deliveryRatePercent === null ? '—' : `${emailSummary.deliveryRatePercent}%`}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Emails Failed</span>
                              <span>{emailSummary.failedToday}</span>
                            </div>
                          </div>
                        )}
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
