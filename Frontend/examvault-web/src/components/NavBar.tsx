import { Dropdown, Container, Nav, Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import UserAvatar from './UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathForRole } from '../utils/roleRouting';

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Navbar bg="white" expand="md" className="border-bottom py-3">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <BrandMark variant="full" size={40} />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav" className="justify-content-between">
          <Nav className="mx-auto gap-3">
            <Nav.Link as={Link} to="/" className="fw-medium text-dark">
              Home
            </Nav.Link>
            <Nav.Link href="#features" className="fw-medium text-dark">
              Features
            </Nav.Link>
            <Nav.Link as={Link} to="/exams" className="fw-medium text-dark">
              Exams
            </Nav.Link>
            <Nav.Link as={Link} to="/pricing" className="fw-medium text-dark">
              Pricing
            </Nav.Link>
            <Nav.Link as={Link} to="/about" className="fw-medium text-dark">
              About Us
            </Nav.Link>
            <Nav.Link as={Link} to="/contact" className="fw-medium text-dark">
              Contact
            </Nav.Link>
          </Nav>

          {isAuthenticated && user ? (
            <Dropdown align="end">
              <Dropdown.Toggle
                as="div"
                bsPrefix="navbar-profile-toggle"
                className="d-flex align-items-center gap-2"
                style={{ cursor: 'pointer' }}
              >
                <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} />
                <span className="fw-medium">{user.fullName}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={Link} to={dashboardPathForRole(user.role)}>
                  {user.role === 'Admin' ? 'Admin Panel' : 'Dashboard'}
                </Dropdown.Item>
                <Dropdown.Item onClick={() => void logout()}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-outline-primary">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
