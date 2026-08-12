import { Dropdown, Container, Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import { useAuth } from '../hooks/useAuth';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? '?';
  return initials.toUpperCase();
}

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Navbar bg="white" expand="md" className="border-bottom py-3">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
          <BrandMark />
          ExamVault
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav" className="justify-content-end">
          {isAuthenticated && user ? (
            <Dropdown align="end">
              <Dropdown.Toggle
                as="div"
                bsPrefix="navbar-profile-toggle"
                className="d-flex align-items-center gap-2"
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: 36, height: 36, fontSize: 14 }}
                >
                  {getInitials(user.fullName)}
                </div>
                <span className="fw-medium">{user.fullName}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={Link} to={user.role === 'Admin' ? '/admin/dashboard' : '/profile'}>
                  {user.role === 'Admin' ? 'Admin Panel' : 'Profile'}
                </Dropdown.Item>
                <Dropdown.Item onClick={() => void logout()}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-outline-secondary">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
