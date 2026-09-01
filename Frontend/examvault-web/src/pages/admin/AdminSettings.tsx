import { useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import SettingsCard from '../../components/settings/SettingsCard';
import type { SettingsCardRow } from '../../components/settings/SettingsCard';
import {
  useExamDefaults,
  useGeneralSettings,
  useProctoringSettings,
  useReminderSettings,
} from '../../hooks/useExams';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useMyPreferences } from '../../hooks/useNotifications';

const icon = {
  general: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  exam: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  security: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  proctoring: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  notification: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  system: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="8" rx="2" />
      <rect x="2" y="13" width="20" height="8" rx="2" />
      <line x1="6" y1="7" x2="6.01" y2="7" />
      <line x1="6" y1="17" x2="6.01" y2="17" />
    </svg>
  ),
};

const YesBadge = ({ on }: { on: boolean }) => (
  <span className={on ? 'text-success' : 'text-muted'}>{on ? 'Enabled' : 'Disabled'}</span>
);

function withinLastDays(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

export default function AdminSettings() {
  const [search, setSearch] = useState('');

  const { data: general, isLoading: loadingGeneral } = useGeneralSettings();
  const { data: examDefaults, isLoading: loadingExamDefaults } = useExamDefaults();
  const { data: proctoring, isLoading: loadingProctoring } = useProctoringSettings();
  const { data: reminders, isLoading: loadingReminders } = useReminderSettings();
  const { data: system, isLoading: loadingSystem } = useSystemSettings();
  const { data: preferences } = useMyPreferences();

  const isLoading = loadingGeneral || loadingExamDefaults || loadingProctoring || loadingReminders || loadingSystem;

  const resultPref = (preferences ?? []).find((p) => p.type === 'Result');
  const anyEmailEnabled = (preferences ?? []).some((p) => p.emailEnabled);
  const anyInAppEnabled = (preferences ?? []).some((p) => p.inAppEnabled);
  const remindersEnabledCount = (reminders ? [reminders.enable24HourReminder, reminders.enable1HourReminder] : []).filter(
    Boolean,
  ).length;

  const cards = useMemo(() => {
    const generalRows: SettingsCardRow[] = general
      ? [
          { label: 'Organization Profile', value: general.organizationName },
          { label: 'Language', value: general.language },
          { label: 'Timezone', value: general.timezone },
          { label: 'Date Format', value: general.dateFormat },
          { label: 'Support Email', value: general.supportEmail || '—' },
        ]
      : [];

    const examRows: SettingsCardRow[] = examDefaults
      ? [
          { label: 'Default Exam Duration', value: `${examDefaults.defaultDurationMinutes} Minutes` },
          { label: 'Passing Score', value: `${examDefaults.passingScorePercent}%` },
          { label: 'Maximum Attempts', value: `${examDefaults.defaultMaxAttempts} Attempts` },
          {
            label: 'Negative Marking',
            value: examDefaults.negativeMarkingEnabled
              ? `Enabled (${examDefaults.negativeMarkingValue})`
              : 'Disabled',
          },
          { label: 'Auto Submit', value: <YesBadge on={examDefaults.autoSubmitEnabled} /> },
        ]
      : [];

    const securityRows: SettingsCardRow[] = proctoring
      ? [
          { label: 'Fullscreen Enforcement', value: <YesBadge on={proctoring.fullscreenExitEnabled} /> },
          { label: 'Tab Switching Detection', value: <YesBadge on={proctoring.multipleTabsEnabled} /> },
          { label: 'Copy / Paste Restriction', value: <YesBadge on={proctoring.copyPasteBlockingEnabled} /> },
          { label: 'Right-Click Restriction', value: <YesBadge on={proctoring.rightClickBlockingEnabled} /> },
          { label: 'Session Timeout', value: `${proctoring.sessionTimeoutMinutes} Minutes` },
        ]
      : [];

    const proctoringRows: SettingsCardRow[] = proctoring
      ? [
          { label: 'AI Proctoring (Master Switch)', value: <YesBadge on={proctoring.proctoringEnabled} /> },
          { label: 'Face Detection', value: <YesBadge on={proctoring.faceDetectionEnabled} /> },
          { label: 'Multiple Person Detection', value: <YesBadge on={proctoring.multiPersonDetectionEnabled} /> },
          { label: 'Screen Monitoring', value: <YesBadge on={proctoring.screenMonitoringEnabled} /> },
          { label: 'Multiple Monitor Detection', value: <YesBadge on={proctoring.multipleMonitorsEnabled} /> },
        ]
      : [];

    const notificationRows: SettingsCardRow[] = reminders
      ? [
          { label: 'Exam Reminders', value: `${remindersEnabledCount} Enabled` },
          { label: 'Result Notifications', value: <YesBadge on={resultPref ? resultPref.inAppEnabled || resultPref.emailEnabled : true} /> },
          { label: 'Email Notifications', value: <YesBadge on={preferences ? anyEmailEnabled : true} /> },
          { label: 'In-App Notifications', value: <YesBadge on={preferences ? anyInAppEnabled : true} /> },
        ]
      : [];

    const systemRows: SettingsCardRow[] = system
      ? [
          { label: 'Maintenance Mode', value: <YesBadge on={system.maintenanceModeEnabled} /> },
          { label: 'Backup Frequency', value: system.backupFrequency },
          { label: 'Audit Log Retention', value: `${system.auditLogRetentionDays} Days` },
          { label: 'System Environment', value: system.environment },
          { label: 'Log Level', value: system.logLevel },
        ]
      : [];

    return [
      {
        key: 'general',
        icon: icon.general,
        iconBg: '#ede9fe',
        iconColor: '#7c3aed',
        title: 'General Settings',
        subtitle: 'Basic information about your organization and system preferences.',
        rows: generalRows,
        manageLabel: 'Manage General Settings',
        manageTo: '/admin/settings/general',
      },
      {
        key: 'exam',
        icon: icon.exam,
        iconBg: '#dbeafe',
        iconColor: '#2563eb',
        title: 'Exam Settings',
        subtitle: 'Configure default exam behavior and assessment preferences.',
        rows: examRows,
        manageLabel: 'Manage Exam Settings',
        manageTo: '/admin/settings/exams',
      },
      {
        key: 'security',
        icon: icon.security,
        iconBg: '#d1fae5',
        iconColor: '#059669',
        title: 'Security Settings',
        subtitle: 'Control exam environment security and access restrictions.',
        rows: securityRows,
        manageLabel: 'Manage Security Settings',
        manageTo: '/admin/settings/security',
      },
      {
        key: 'proctoring',
        icon: icon.proctoring,
        iconBg: '#fef3c7',
        iconColor: '#d97706',
        title: 'Proctoring Settings',
        subtitle: 'Configure AI proctoring checks and monitoring rules.',
        rows: proctoringRows,
        manageLabel: 'Manage Proctoring Settings',
        manageTo: '/admin/settings/proctoring',
      },
      {
        key: 'notification',
        icon: icon.notification,
        iconBg: '#fce7f3',
        iconColor: '#db2777',
        title: 'Notification Settings',
        subtitle: 'Manage notifications, reminders and communication preferences.',
        rows: notificationRows,
        manageLabel: 'Manage Notification Settings',
        manageTo: '/admin/settings/notifications',
      },
      {
        key: 'system',
        icon: icon.system,
        iconBg: '#e0e7ff',
        iconColor: '#4f46e5',
        title: 'System Settings',
        subtitle: 'Configure system behavior, maintenance and operational settings.',
        rows: systemRows,
        manageLabel: 'Manage System Settings',
        manageTo: '/admin/settings/system',
      },
    ];
  }, [general, examDefaults, proctoring, reminders, system, preferences, resultPref, anyEmailEnabled, anyInAppEnabled, remindersEnabledCount]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.rows.some((r) => r.label.toLowerCase().includes(q)),
    );
  }, [cards, search]);

  // Real, documented rules (not a vibes-based number) - see ActionPlan.txt.
  const stats = useMemo(() => {
    if (!general || !examDefaults || !proctoring || !reminders || !system) {
      return null;
    }

    const boolFields = [
      reminders.enable24HourReminder,
      reminders.enable1HourReminder,
      proctoring.proctoringEnabled,
      proctoring.faceDetectionEnabled,
      proctoring.multiPersonDetectionEnabled,
      proctoring.screenMonitoringEnabled,
      proctoring.fullscreenExitEnabled,
      proctoring.multipleTabsEnabled,
      proctoring.copyPasteBlockingEnabled,
      proctoring.rightClickBlockingEnabled,
      proctoring.multipleMonitorsEnabled,
      examDefaults.negativeMarkingEnabled,
      examDefaults.autoSaveEnabled,
      examDefaults.autoSubmitEnabled,
      system.maintenanceModeEnabled,
    ];
    const totalConfigurations =
      boolFields.length +
      5 /* General: name/email/language/timezone/dateFormat */ +
      1 /* ProctoringSettings.sessionTimeoutMinutes */ +
      6 /* ExamDefaults: duration/passing/attempts/negValue/navMode/publishMode */ +
      3 /* System: backupFrequency/retentionDays/logLevel */;
    const enabled = boolFields.filter(Boolean).length;

    const recentlyUpdated = [general, examDefaults, proctoring, reminders, system].filter((s) =>
      withinLastDays(s.updatedAtUtc, 7),
    ).length;

    const requireAttention =
      (system.maintenanceModeEnabled ? 1 : 0) +
      (!proctoring.proctoringEnabled ? 1 : 0) +
      [
        proctoring.fullscreenExitEnabled,
        proctoring.multipleTabsEnabled,
        proctoring.copyPasteBlockingEnabled,
        proctoring.rightClickBlockingEnabled,
      ].filter((v) => !v).length;

    return { totalConfigurations, enabled, recentlyUpdated, requireAttention };
  }, [general, examDefaults, proctoring, reminders, system]);

  return (
    <AdminLayout active="Settings">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Settings</h1>
          <p className="text-muted mb-0">Manage all system configurations and preferences.</p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search settings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (
        <>
          <Row className="g-4 mb-4">
            {filteredCards.map((c) => (
              <Col key={c.key} xs={12} md={6} lg={4}>
                <SettingsCard
                  icon={c.icon}
                  iconBg={c.iconBg}
                  iconColor={c.iconColor}
                  title={c.title}
                  subtitle={c.subtitle}
                  rows={c.rows}
                  manageLabel={c.manageLabel}
                  manageTo={c.manageTo}
                  manageColor={c.iconColor}
                />
              </Col>
            ))}
            {filteredCards.length === 0 && (
              <Col xs={12}>
                <div className="text-center text-muted py-5">No settings match "{search}".</div>
              </Col>
            )}
          </Row>

          {stats && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Row className="align-items-center g-4">
                  <Col xs={12} lg={4}>
                    <SectionHeader
                      icon={<span style={{ color: '#4f46e5' }}>{icon.system}</span>}
                      title="Settings Overview"
                      subtitle="These settings apply globally to the entire system. Changes take effect immediately after saving."
                    />
                  </Col>
                  <Col xs={6} lg={2}>
                    <div className="h4 fw-bold mb-0">{stats.totalConfigurations}</div>
                    <div className="text-muted small">Total Configurations</div>
                  </Col>
                  <Col xs={6} lg={2}>
                    <div className="h4 fw-bold mb-0 text-success">{stats.enabled}</div>
                    <div className="text-muted small">Enabled</div>
                  </Col>
                  <Col xs={6} lg={2}>
                    <div className="h4 fw-bold mb-0 text-warning">{stats.requireAttention}</div>
                    <div className="text-muted small">Require Attention</div>
                  </Col>
                  <Col xs={6} lg={2}>
                    <div className="h4 fw-bold mb-0 text-info">{stats.recentlyUpdated}</div>
                    <div className="text-muted small">Recently Updated</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
