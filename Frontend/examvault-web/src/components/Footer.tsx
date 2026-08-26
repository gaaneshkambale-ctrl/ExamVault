import { Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-top bg-white pt-5 pb-4">
      <Container>
        <Row className="g-4 mb-4">
          <Col xs={12} md={4}>
            <div className="d-flex align-items-center mb-2">
              <BrandMark variant="full" size={36} />
            </div>
            <p className="text-muted small mb-0">
              A secure and intelligent online examination platform for institutions, educators and
              learners.
            </p>
          </Col>

          <Col xs={6} md={4}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Quick Links</div>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <Link to="/" className="text-decoration-none text-dark small">
                  Home
                </Link>
              </li>
              <li>
                <a href="/#features" className="text-decoration-none text-dark small">
                  Features
                </a>
              </li>
              <li>
                <Link to="/pricing" className="text-decoration-none text-dark small">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-decoration-none text-dark small">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-decoration-none text-dark small">
                  Contact
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={6} md={4}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Account</div>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <Link to="/login" className="text-decoration-none text-dark small">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-decoration-none text-dark small">
                  Get Started
                </Link>
              </li>
            </ul>
          </Col>
        </Row>

        <div className="border-top pt-3 text-center text-muted small">
          &copy; {year} ExamVault. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
