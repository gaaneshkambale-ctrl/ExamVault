import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? '?';
  return initials.toUpperCase();
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
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
          style={{ width: 36, height: 36, fontSize: 14 }}
        >
          {getInitials(user.fullName)}
        </div>
        <div className="d-none d-sm-block text-end">
          <div className="small fw-medium">{user.fullName}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            {user.role}
          </div>
        </div>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item as={Link} to="/profile">
          Profile
        </Dropdown.Item>
        <Dropdown.Item onClick={() => void handleLogout()}>Logout</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
