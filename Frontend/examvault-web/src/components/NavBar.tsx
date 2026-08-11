import { Container, Nav, Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function BrandMark() {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-2 text-white"
      style={{ width: 32, height: 32, background: 'linear-gradient(160deg, #6366f1, #4338ca)' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="2" width="18" height="20" rx="2.5" fill="rgba(255,255,255,0.2)" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function NavBar() {
  return (
    <Navbar bg="white" expand="md" className="border-bottom py-3">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
          <BrandMark />
          ExamVault
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="mx-auto">
            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>
            <Nav.Link href="#features">Features</Nav.Link>
            <Nav.Link href="#about">About</Nav.Link>
            <Nav.Link href="#contact">Contact</Nav.Link>
          </Nav>
          <div className="d-flex gap-2">
            <Link to="/login" className="btn btn-outline-secondary">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
