import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';
import { useFeatures } from '../hooks/useFeatures';

export type AdminNavItem =
  | 'Dashboard'
  | 'Users'
  | 'All Users'
  | 'Add User'
  | 'Roles & Permissions'
  | 'User Groups'
  | 'Exams'
  | 'Exam Types'
  | 'Exam Scheduled'
  | 'Live Monitoring'
  | 'Active Exams'
  | 'Student Attempts'
  | 'Security Violations'
  | 'Proctoring'
  | 'Results'
  | 'Exam Results'
  | 'Student Results'
  | 'Result Analytics'
  | 'Publish Results'
  | 'Reports'
  | 'Exam Reports'
  | 'Student Reports'
  | 'Performance Reports'
  | 'Audit Reports'
  | 'Exam Type Wise Report'
  | 'Notifications'
  | 'Create Notification'
  | 'History'
  | 'Notification Templates'
  | 'Settings'
  | 'Profile';

interface NavChild {
  label: AdminNavItem;
  path: string;
}

interface NavItem {
  label: AdminNavItem;
  path: string | null;
  children?: NavChild[];
  // Matches a PlanFeature name (Backend/Shared/.../Multitenancy/
  // PlanFeature.cs) - hidden whenever the current user's tenant Plan
  // doesn't include it (SuperAdmin always sees everything). Only set on
  // groups gated end-to-end (nav + route), see useFeatures.ts.
  feature?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  {
    label: 'Users',
    path: '/admin/users',
    children: [
      { label: 'All Users', path: '/admin/users' },
      { label: 'Add User', path: '/admin/users/create' },
      { label: 'Roles & Permissions', path: '/admin/users/roles' },
      { label: 'User Groups', path: '/admin/users/groups' },
    ],
  },
  {
    label: 'Exams',
    path: '/admin/exams',
    children: [
      { label: 'Exam Types', path: '/admin/exam-types' },
      { label: 'Exam Scheduled', path: '/admin/exams/scheduled' },
    ],
  },
  {
    label: 'Live Monitoring',
    path: '/admin/live-monitoring/active-exams',
    feature: 'LiveMonitoring',
    children: [
      { label: 'Active Exams', path: '/admin/live-monitoring/active-exams' },
      { label: 'Student Attempts', path: '/admin/live-monitoring/student-attempts' },
      { label: 'Security Violations', path: '/admin/live-monitoring/security-violations' },
      { label: 'Proctoring', path: '/admin/live-monitoring/proctoring' },
    ],
  },
  {
    label: 'Results',
    path: '/admin/results/exams',
    children: [
      { label: 'Exam Results', path: '/admin/results/exams' },
      { label: 'Student Results', path: '/admin/results/students' },
      { label: 'Result Analytics', path: '/admin/results/analytics' },
      { label: 'Publish Results', path: '/admin/results/publish' },
    ],
  },
  {
    label: 'Reports',
    path: '/admin/reports/exams',
    children: [
      { label: 'Exam Reports', path: '/admin/reports/exams' },
      { label: 'Student Reports', path: '/admin/reports/students' },
      { label: 'Performance Reports', path: '/admin/reports/performance' },
      { label: 'Audit Reports', path: '/admin/reports/audit' },
      { label: 'Exam Type Wise Report', path: '/admin/reports/exam-type-wise' },
    ],
  },
  {
    label: 'Notifications',
    path: '/admin/notifications',
    children: [
      { label: 'Create Notification', path: '/admin/notifications/create' },
      { label: 'History', path: '/admin/notifications/history' },
      { label: 'Notification Templates', path: '/admin/notifications/templates' },
    ],
  },
  { label: 'Settings', path: '/admin/settings' },
];

const iconPaths: Partial<Record<AdminNavItem, ReactNode>> = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  Users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  Exams: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  'Exam Types': (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  'Live Monitoring': (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Results: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  Reports: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  Notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

function NavIcon({ label }: { label: AdminNavItem }) {
  const path = iconPaths[label];
  if (!path) return null;
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
      {path}
    </svg>
  );
}

interface AdminSidebarProps {
  active: AdminNavItem;
  show?: boolean;
  onClose?: () => void;
}

function isSectionActive(item: NavItem, active: AdminNavItem): boolean {
  return item.label === active || (item.children?.some((child) => child.label === active) ?? false);
}

export default function AdminSidebar({ active, show = false, onClose = () => {} }: AdminSidebarProps) {
  const { hasFeature } = useFeatures();
  const visibleNavItems = navItems.filter((item) => !item.feature || hasFeature(item.feature));

  const [openSections, setOpenSections] = useState<Set<AdminNavItem>>(
    () => new Set(visibleNavItems.filter((item) => item.children && isSectionActive(item, active)).map((item) => item.label)),
  );

  const toggleSection = (label: AdminNavItem) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <Offcanvas show={show} onHide={onClose} responsive="md" className="flex-shrink-0" style={{ width: 240 }}>
      <div className="d-flex flex-column h-100 text-white" style={{ background: '#0f172a' }}>
        <Offcanvas.Header closeButton closeVariant="white" className="d-md-none">
          <Offcanvas.Title className="d-flex align-items-center gap-2 fw-bold">
            <BrandMark />
            ExamVault
          </Offcanvas.Title>
        </Offcanvas.Header>
        <div className="d-flex flex-column flex-grow-1 p-3 pt-0 pt-md-3">
        <div className="d-none d-md-flex align-items-center gap-2 fw-bold mb-4 px-2 py-2">
          <BrandMark />
          ExamVault
        </div>
        <nav className="d-flex flex-column gap-1 flex-grow-1">
        {visibleNavItems.map((item) => {
          const isOpen = item.children ? openSections.has(item.label) : false;
          return (
            <div key={item.label}>
              {item.path ? (
                <div
                  className="d-flex align-items-center rounded-2"
                  style={
                    item.label === active
                      ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                      : { color: '#94a3b8' }
                  }
                >
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className="px-3 py-2 text-decoration-none flex-grow-1 d-flex align-items-center gap-2"
                    style={{ color: 'inherit' }}
                  >
                    <NavIcon label={item.label} />
                    {item.label}
                  </Link>
                  {item.children && (
                    <button
                      type="button"
                      onClick={() => toggleSection(item.label)}
                      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
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
              ) : (
                <span
                  className="px-3 py-2 rounded-2 d-flex align-items-center gap-2"
                  style={{ color: '#475569' }}
                >
                  <NavIcon label={item.label} />
                  {item.label}
                </span>
              )}
              {item.children && isOpen && (
                <div className="d-flex flex-column gap-1 mt-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      to={child.path}
                      onClick={onClose}
                      className="py-1 rounded-2 text-decoration-none small d-block"
                      style={{
                        paddingLeft: '2.25rem',
                        paddingRight: '0.75rem',
                        ...(child.label === active
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
