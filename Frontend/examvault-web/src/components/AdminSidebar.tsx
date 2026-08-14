import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark';
import { useAuth } from '../hooks/useAuth';

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

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? '?';
  return initials.toUpperCase();
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
        {navItems.map((item) => (
          <div key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                className="px-3 py-2 rounded-2 text-decoration-none d-block"
                style={
                  item.label === active
                    ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                    : { color: '#94a3b8' }
                }
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-3 py-2 rounded-2 d-block" style={{ color: '#475569' }}>
                {item.label}
              </span>
            )}
            {item.children && (
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
        ))}
      </nav>

      {user && (
        <Dropdown drop="up">
          <Dropdown.Toggle
            as="div"
            bsPrefix="admin-sidebar-profile"
            className="d-flex align-items-center gap-2 px-2 py-2 rounded-2"
            style={{ cursor: 'pointer' }}
          >
            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
              style={{ width: 36, height: 36, fontSize: 14 }}
            >
              {getInitials(user.fullName)}
            </div>
            <div className="flex-grow-1 overflow-hidden">
              <div className="text-truncate small fw-medium">{user.fullName}</div>
              <div className="text-truncate small" style={{ color: '#94a3b8' }}>
                {user.role}
              </div>
            </div>
            <span style={{ color: '#94a3b8' }}>&#9662;</span>
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item as={Link} to="/profile">
              Profile
            </Dropdown.Item>
            <Dropdown.Item onClick={() => void handleLogout()}>Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </aside>
  );
}
