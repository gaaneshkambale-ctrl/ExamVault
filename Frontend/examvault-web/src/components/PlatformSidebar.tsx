import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';

// Keyed separately from the displayed label because two groups in
// ExamVault Super Admin Menu.txt reuse the same label ("Active
// Organizations" appears under both Organizations and System Monitoring)
// - `key` is what active-highlighting and React list keys use, `label` is
// only ever rendered text.
interface NavChild {
  key: string;
  label: string;
  path: string;
}

interface NavGroup {
  key: string;
  label: string;
  path: string | null;
  icon: ReactNode;
  children?: NavChild[];
}

const groupIcons: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  organizations: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  exams: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  questions: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  submissions: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  subscriptions: (
    <>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </>
  ),
  monitoring: (
    <>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  reports: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  security: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  logs: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
};

const navGroups: NavGroup[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/platform/dashboard', icon: groupIcons.dashboard },
  {
    key: 'organizations',
    label: 'Organizations',
    path: '/platform/organizations',
    icon: groupIcons.organizations,
    children: [
      { key: 'org-all', label: 'All Organizations', path: '/platform/organizations' },
      { key: 'org-create', label: 'Create Organization', path: '/platform/organizations/create' },
      { key: 'org-active', label: 'Active Organizations', path: '/platform/organizations/active' },
      { key: 'org-trial', label: 'Trial Organizations', path: '/platform/organizations/trial' },
      { key: 'org-suspended', label: 'Suspended Organizations', path: '/platform/organizations/suspended' },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    path: '/platform/users',
    icon: groupIcons.users,
    children: [
      { key: 'users-all', label: 'All Users', path: '/platform/users' },
      { key: 'users-org-admins', label: 'Organization Admins', path: '/platform/users/organization-admins' },
      { key: 'users-students', label: 'Students', path: '/platform/users/students' },
      { key: 'users-platform-admins', label: 'Platform Admins', path: '/platform/users/platform-admins' },
      { key: 'users-roles', label: 'Roles & Permissions', path: '/platform/users/roles' },
    ],
  },
  {
    key: 'exams',
    label: 'Exams',
    path: '/platform/exams',
    icon: groupIcons.exams,
    children: [
      { key: 'exams-all', label: 'All Exams', path: '/platform/exams' },
      { key: 'exams-categories', label: 'Exam Categories', path: '/platform/exams/categories' },
      { key: 'exams-sections', label: 'Sections', path: '/platform/exams/sections' },
      { key: 'exams-question-bank', label: 'Question Bank', path: '/platform/exams/question-bank' },
      { key: 'exams-tags', label: 'Tags', path: '/platform/exams/tags' },
    ],
  },
  { key: 'questions', label: 'Questions', path: '/platform/questions', icon: groupIcons.questions },
  { key: 'submissions', label: 'Submissions', path: '/platform/submissions', icon: groupIcons.submissions },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    path: '/platform/subscriptions',
    icon: groupIcons.subscriptions,
    children: [
      { key: 'subs-plans', label: 'Plans', path: '/platform/subscriptions/plans' },
      { key: 'subs-orgs', label: 'Organizations & Plans', path: '/platform/subscriptions/organizations' },
      { key: 'subs-usage', label: 'Usage', path: '/platform/subscriptions/usage' },
      { key: 'subs-history', label: 'Subscription History', path: '/platform/subscriptions/history' },
    ],
  },
  {
    key: 'monitoring',
    label: 'System Monitoring',
    path: '/platform/monitoring',
    icon: groupIcons.monitoring,
    children: [
      { key: 'mon-overview', label: 'Overview', path: '/platform/monitoring' },
      { key: 'mon-active-orgs', label: 'Active Organizations', path: '/platform/monitoring/active-organizations' },
      { key: 'mon-active-exams', label: 'Active Exams', path: '/platform/monitoring/active-exams' },
      { key: 'mon-system-health', label: 'System Health', path: '/platform/monitoring/system-health' },
      { key: 'mon-api-health', label: 'API Health', path: '/platform/monitoring/api-health' },
      { key: 'mon-service-status', label: 'Service Status', path: '/platform/monitoring/service-status' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    path: '/platform/notifications',
    icon: groupIcons.notifications,
    children: [
      { key: 'notif-announcement', label: 'Platform Announcement', path: '/platform/notifications/announcement' },
      { key: 'notif-history', label: 'Notification History', path: '/platform/notifications/history' },
      { key: 'notif-templates', label: 'Templates', path: '/platform/notifications/templates' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/platform/reports',
    icon: groupIcons.reports,
    children: [
      { key: 'reports-org', label: 'Organization Report', path: '/platform/reports/organizations' },
      { key: 'reports-users', label: 'User Report', path: '/platform/reports/users' },
      { key: 'reports-exam-usage', label: 'Exam Usage', path: '/platform/reports/exam-usage' },
      { key: 'reports-platform-usage', label: 'Platform Usage', path: '/platform/reports/platform-usage' },
      { key: 'reports-audit', label: 'Audit Reports', path: '/platform/reports/audit' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    path: '/platform/security',
    icon: groupIcons.security,
    children: [
      { key: 'sec-events', label: 'Security Events', path: '/platform/security/events' },
      { key: 'sec-login-activity', label: 'Login Activity', path: '/platform/security/login-activity' },
      { key: 'sec-failed-logins', label: 'Failed Login Attempts', path: '/platform/security/failed-logins' },
      { key: 'sec-audit-logs', label: 'Audit Logs', path: '/platform/security/audit-logs' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/platform/settings',
    icon: groupIcons.settings,
    children: [
      { key: 'settings-platform', label: 'Platform Settings', path: '/platform/settings/platform' },
      { key: 'settings-tenant', label: 'Tenant Settings', path: '/platform/settings/tenant' },
      { key: 'settings-email', label: 'Email Settings', path: '/platform/settings/email' },
      { key: 'settings-notifications', label: 'Notification Settings', path: '/platform/settings/notifications' },
      { key: 'settings-security', label: 'Security Settings', path: '/platform/settings/security' },
    ],
  },
  { key: 'system-logs', label: 'System Logs', path: '/platform/system-logs', icon: groupIcons.logs },
];

function NavIcon({ icon }: { icon: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      {icon}
    </svg>
  );
}

interface PlatformSidebarProps {
  active: string;
  show?: boolean;
  onClose?: () => void;
}

function isGroupActive(group: NavGroup, active: string): boolean {
  return group.key === active || (group.children?.some((child) => child.key === active) ?? false);
}

export default function PlatformSidebar({ active, show = false, onClose = () => {} }: PlatformSidebarProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(navGroups.filter((group) => group.children && isGroupActive(group, active)).map((g) => g.key)),
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Offcanvas show={show} onHide={onClose} responsive="md" className="flex-shrink-0" style={{ width: 260 }}>
      <div className="d-flex flex-column h-100 text-white" style={{ background: '#0f172a' }}>
        <Offcanvas.Header closeButton closeVariant="white" className="d-md-none">
          <Offcanvas.Title className="d-flex align-items-center gap-2 fw-bold">
            <BrandMark />
            ExamVault
          </Offcanvas.Title>
        </Offcanvas.Header>
        <div className="d-flex flex-column flex-grow-1 p-3 pt-0 pt-md-3" style={{ overflowY: 'auto' }}>
          <div className="d-none d-md-flex align-items-center gap-2 fw-bold mb-1 px-2 py-2">
            <BrandMark />
            ExamVault
          </div>
          <div className="px-2 mb-3 text-uppercase small fw-semibold" style={{ color: '#6366f1', letterSpacing: 1 }}>
            Platform Admin
          </div>
          <nav className="d-flex flex-column gap-1 flex-grow-1">
            {navGroups.map((group) => {
              const isOpen = group.children ? openSections.has(group.key) : false;
              return (
                <div key={group.key}>
                  <div
                    className="d-flex align-items-center rounded-2"
                    style={
                      group.key === active
                        ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                        : { color: '#94a3b8' }
                    }
                  >
                    <Link
                      to={group.path!}
                      onClick={onClose}
                      className="px-3 py-2 text-decoration-none flex-grow-1 d-flex align-items-center gap-2"
                      style={{ color: 'inherit' }}
                    >
                      <NavIcon icon={group.icon} />
                      {group.label}
                    </Link>
                    {group.children && (
                      <button
                        type="button"
                        onClick={() => toggleSection(group.key)}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${group.label}`}
                        className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center justify-content-center me-2"
                        style={{ color: 'inherit', width: 20, height: 20 }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {group.children && isOpen && (
                    <div className="d-flex flex-column gap-1 mt-1">
                      {group.children.map((child) => (
                        <Link
                          key={child.key}
                          to={child.path}
                          onClick={onClose}
                          className="py-1 rounded-2 text-decoration-none small d-block"
                          style={{
                            paddingLeft: '2.25rem',
                            paddingRight: '0.75rem',
                            ...(child.key === active
                              ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                              : { color: '#94a3b8' }),
                          }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </Offcanvas>
  );
}
