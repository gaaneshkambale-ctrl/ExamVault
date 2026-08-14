import { useState } from 'react';
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
  { label: 'Settings', path: null },
];

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
                    className="px-3 py-2 text-decoration-none flex-grow-1"
                    style={{ color: 'inherit' }}
                  >
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
                <span className="px-3 py-2 rounded-2 d-block" style={{ color: '#475569' }}>
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
