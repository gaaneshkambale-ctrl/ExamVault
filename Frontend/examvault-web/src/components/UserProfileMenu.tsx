import { Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';

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
