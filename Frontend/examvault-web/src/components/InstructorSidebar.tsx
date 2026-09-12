import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';

export type InstructorNavItem =
  | 'Dashboard'
  | 'Exams'
  | 'Scheduled Exams'
  | 'Active Exams'
  | 'Student Attempts'
  | 'Security Violations'
  | 'Exam Results'
  | 'Student Results'
  | 'Result Analytics'
  | 'Publish Results'
  | 'Exam Reports'
  | 'Student Reports'
  | 'Performance Reports'
  | 'Exam Type Performance'
  | 'Notifications'
  | 'Create Notification'
  | 'History'
  | 'Profile';

interface NavLink {
  kind: 'link';
  label: InstructorNavItem;
  path: string;
}

interface NavSection {
  kind: 'section';
  label: string;
}

type NavEntry = NavLink | NavSection;

// Flat rather than AdminSidebar's collapsible groups - Instructor's own set
// is small enough that an always-visible list reads better than building
// expand/collapse machinery for it. Section labels are purely visual
// grouping, not separate routes.
const navItems: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', path: '/instructor/dashboard' },
  { kind: 'link', label: 'Exams', path: '/admin/exams' },
  { kind: 'link', label: 'Scheduled Exams', path: '/admin/exams/scheduled' },
  { kind: 'section', label: 'Live Monitoring' },
  { kind: 'link', label: 'Active Exams', path: '/admin/live-monitoring/active-exams' },
  { kind: 'link', label: 'Student Attempts', path: '/admin/live-monitoring/student-attempts' },
  { kind: 'link', label: 'Security Violations', path: '/admin/live-monitoring/security-violations' },
  { kind: 'section', label: 'Results & Reports' },
  { kind: 'link', label: 'Exam Results', path: '/admin/results/exams' },
  { kind: 'link', label: 'Student Results', path: '/admin/results/students' },
  { kind: 'link', label: 'Result Analytics', path: '/admin/results/analytics' },
  { kind: 'link', label: 'Publish Results', path: '/admin/results/publish' },
  { kind: 'link', label: 'Exam Reports', path: '/admin/reports/exams' },
  { kind: 'link', label: 'Student Reports', path: '/admin/reports/students' },
  { kind: 'link', label: 'Performance Reports', path: '/admin/reports/performance' },
  { kind: 'link', label: 'Exam Type Performance', path: '/admin/reports/exam-type-wise' },
  { kind: 'link', label: 'Notifications', path: '/admin/notifications' },
  { kind: 'link', label: 'Create Notification', path: '/admin/notifications/create' },
  { kind: 'link', label: 'History', path: '/admin/notifications/history' },
];

const iconPaths: Partial<Record<InstructorNavItem, ReactNode>> = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
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
  'Scheduled Exams': (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  'Active Exams': (
    <>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </>
  ),
  'Student Attempts': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </>
  ),
  'Security Violations': (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  'Exam Results': (
    <>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </>
  ),
  'Student Results': (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  'Result Analytics': (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </>
  ),
  'Exam Reports': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  'Student Reports': (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  'Performance Reports': (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  'Publish Results': (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
  'Exam Type Performance': (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  Notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  'Create Notification': (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  History: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
};

function NavIcon({ label }: { label: InstructorNavItem }) {
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

interface InstructorSidebarProps {
  active: InstructorNavItem;
  show?: boolean;
  onClose?: () => void;
}

export default function InstructorSidebar({ active, show = false, onClose = () => {} }: InstructorSidebarProps) {
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
            {navItems.map((item) =>
              item.kind === 'section' ? (
                <div
                  key={item.label}
                  className="px-3 pt-3 pb-1 text-uppercase small fw-bold"
                  style={{ color: '#64748b', fontSize: 11, letterSpacing: '0.05em' }}
                >
                  {item.label}
                </div>
              ) : (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onClose}
                  className="px-3 py-2 rounded-2 text-decoration-none d-flex align-items-center gap-2"
                  style={
                    item.label === active
                      ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                      : { color: '#94a3b8' }
                  }
                >
                  <NavIcon label={item.label} />
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </Offcanvas>
  );
}
