import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark';
import { useAuth } from '../hooks/useAuth';

export type DashboardNavItem =
  | 'Dashboard'
  | 'My Exams'
  | 'Upcoming Exams'
  | 'My Results'
  | 'My Certificates'
  | 'Profile'
  | 'Notifications'
  | 'Settings';

interface NavItem {
  label: DashboardNavItem;
  path: string | null;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'My Exams', path: '/exams' },
  { label: 'Upcoming Exams', path: '/exams?tab=Upcoming' },
  { label: 'My Results', path: '/results' },
  { label: 'My Certificates', path: null },
  { label: 'Profile', path: '/profile' },
  { label: 'Notifications', path: null },
  { label: 'Settings', path: null },
];

interface DashboardSidebarProps {
  active: DashboardNavItem;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? '?';
  return initials.toUpperCase();
}

export default function DashboardSidebar({ active }: DashboardSidebarProps) {
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
        {navItems.map((item) =>
          item.path ? (
            <Link
              key={item.label}
              to={item.path}
              className="px-3 py-2 rounded-2 text-decoration-none"
              style={
                item.label === active
                  ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                  : { color: '#94a3b8' }
              }
            >
              {item.label}
            </Link>
          ) : (
            <span key={item.label} className="px-3 py-2 rounded-2" style={{ color: '#475569' }}>
              {item.label}
            </span>
          ),
        )}
      </nav>

      {user && (
        <Dropdown drop="up">
          <Dropdown.Toggle
            as="div"
            bsPrefix="student-sidebar-profile"
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
