import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';

function ProfileMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
    </svg>
  );
}

export default function UserProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="div"
        bsPrefix="user-profile-toggle"
        className="d-flex align-items-center gap-2"
        style={{ cursor: 'pointer' }}
      >
        <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} />
        <div className="d-none d-sm-block text-end">
          <div className="small fw-medium">{user.fullName}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            {user.role}
          </div>
        </div>
        <span className="text-muted d-none d-sm-inline-flex">
          <ChevronDownIcon />
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="p-0 overflow-hidden" style={{ width: 260 }}>
        <div className="d-flex align-items-center gap-3 p-3" style={{ background: '#0f172a' }}>
          <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} size={44} />
          <div className="text-white">
            <div className="fw-medium">{user.fullName}</div>
            <div className="text-white-50 small">{user.role}</div>
            <div className="d-flex align-items-center gap-1 small text-white-50">
              <span className="rounded-circle bg-success d-inline-block" style={{ width: 8, height: 8 }} />
              Online
            </div>
          </div>
        </div>
        <Dropdown.Item as={Link} to="/profile" className="d-flex align-items-center gap-2 py-2">
          <ProfileMenuIcon />
          My Profile
        </Dropdown.Item>
        <Dropdown.Item onClick={() => void handleLogout()} className="d-flex align-items-center gap-2 py-2 text-danger">
          <LogoutMenuIcon />
          Logout
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
