import { useState } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import StudentLayout from '../../layouts/StudentLayout';
import PersonalInfoPanel from '../../components/profile/PersonalInfoPanel';
import AccountPreferencesPanel from '../../components/profile/AccountPreferencesPanel';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm';
import SecuritySettingsCard from '../../components/profile/SecuritySettingsCard';
import SessionsPanel from '../../components/profile/SessionsPanel';
import NotificationPreferencesPanel from '../../components/NotificationPreferencesPanel';
import NotificationPreferencesPreview from '../../components/notifications/NotificationPreferencesPreview';

type Section = 'Account Settings' | 'Preferences' | 'Notification Settings' | 'Security Settings' | 'Privacy Settings';

function AccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" />
    </svg>
  );
}

function PreferencesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SECTIONS: { key: Section; icon: ReactNode }[] = [
  { key: 'Account Settings', icon: <AccountIcon /> },
  { key: 'Preferences', icon: <PreferencesIcon /> },
  { key: 'Notification Settings', icon: <NotificationIcon /> },
  { key: 'Security Settings', icon: <SecurityIcon /> },
  { key: 'Privacy Settings', icon: <PrivacyIcon /> },
];

function SecurityLinkRow({ label, subtitle, onClick }: { label: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="d-flex justify-content-between align-items-center w-100 py-2 border-bottom bg-transparent border-0 text-start"
    >
      <div>
        <div className="small fw-medium">{label}</div>
        <div className="text-muted small">{subtitle}</div>
      </div>
      <span className="text-muted">
        <ChevronRightIcon />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('Account Settings');

  return (
    <StudentLayout active="Settings">
      <h1 className="h4 fw-bold mb-1 text-primary">Settings</h1>
      <p className="text-muted mb-4">Manage your account settings and preferences.</p>

      <Row className="g-3">
        <Col lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-2">
              <nav className="d-flex flex-column gap-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSection(s.key)}
                    className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 border-0 text-start"
                    style={
                      s.key === section
                        ? { background: '#eef2ff', color: '#4338ca', fontWeight: 600 }
                        : { background: 'transparent', color: '#374151' }
                    }
                  >
                    {s.icon}
                    {s.key}
                  </button>
                ))}
              </nav>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          {section === 'Account Settings' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-1">Account Settings</h2>
                <p className="text-muted small mb-3">Update your personal information and account details.</p>
                <PersonalInfoPanel />
              </Card.Body>
            </Card>
          )}

          {section === 'Preferences' && (
            <>
              <div className="mb-2 px-1">
                <h2 className="h6 fw-bold mb-1">Preferences</h2>
                <p className="text-muted small">Customize your application experience.</p>
              </div>
              <AccountPreferencesPanel />
            </>
          )}

          {section === 'Notification Settings' && <NotificationPreferencesPanel />}

          {section === 'Security Settings' && (
            <Row className="g-3">
              <Col xs={12}>
                <ChangePasswordForm />
              </Col>
              <Col xs={12}>
                <SecuritySettingsCard />
              </Col>
              <Col xs={12}>
                <SessionsPanel />
              </Col>
            </Row>
          )}

          {section === 'Privacy Settings' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-1">Privacy Settings</h2>
                <p className="text-muted small mb-0">
                  Privacy controls aren't available yet - check back soon.
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={3}>
          <div className="mb-3">
            <NotificationPreferencesPreview onManageClick={() => setSection('Notification Settings')} />
          </div>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-1">Security Settings</h2>
              <p className="text-muted small mb-2">Manage your account security.</p>
              <SecurityLinkRow
                label="Change Password"
                subtitle="Update your account password"
                onClick={() => setSection('Security Settings')}
              />
              <SecurityLinkRow
                label="Active Sessions"
                subtitle="Manage your active sessions"
                onClick={() => setSection('Security Settings')}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </StudentLayout>
  );
}
