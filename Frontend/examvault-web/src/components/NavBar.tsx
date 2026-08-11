import { Container, Nav, Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

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
