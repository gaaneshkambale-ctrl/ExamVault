import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export type AdminNavItem =
  | 'Dashboard'
  | 'Users'
  | 'Roles & Permissions'
  | 'Groups'
  | 'Exams'
  | 'Exam Assignment'
  | 'Questions'
  | 'Categories'
  | 'Results'
  | 'Reports'
  | 'Notifications'
  | 'Create Notification'
  | 'History'
  | 'Notification Settings'
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
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  {
    label: 'Users',
    path: '/admin/users',
    children: [
      { label: 'Roles & Permissions', path: '/admin/users/roles' },
      { label: 'Groups', path: '/admin/users/groups' },
    ],
  },
  {
    label: 'Exams',
    path: '/admin/exams',
    children: [{ label: 'Exam Assignment', path: '/admin/assignments' }],
  },
  { label: 'Questions', path: '/admin/questions' },
  { label: 'Categories', path: null },
  { label: 'Results', path: '/admin/results' },
  { label: 'Reports', path: '/admin/reports' },
  {
    label: 'Notifications',
    path: '/admin/notifications',
    children: [
      { label: 'Create Notification', path: '/admin/notifications/create' },
      { label: 'History', path: '/admin/notifications/history' },
      { label: 'Notification Settings', path: '/notifications/settings' },
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
  Questions: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  Categories: (
    <>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
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
}

function isSectionActive(item: NavItem, active: AdminNavItem): boolean {
  return item.label === active || (item.children?.some((child) => child.label === active) ?? false);
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
  const [openSections, setOpenSections] = useState<Set<AdminNavItem>>(
    () => new Set(navItems.filter((item) => item.children && isSectionActive(item, active)).map((item) => item.label)),
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
    <aside
      className="d-none d-md-flex flex-column text-white p-3 flex-shrink-0"
      style={{ width: 240, background: '#0f172a' }}
    >
      <div className="d-flex align-items-center gap-2 fw-bold mb-4 px-2 py-2">
        <BrandMark />
        ExamVault
      </div>
      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {navItems.map((item) => {
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
    </aside>
  );
}
