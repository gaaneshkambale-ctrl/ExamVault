import { useState } from 'react';
import { Col, Container, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
      style={{ width: 32, height: 32, background: '#f3f4f6', color: '#4b5563' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        {children}
      </svg>
    </span>
  );
}

// A link to a page that genuinely doesn't exist yet (Privacy Policy, Terms
// of Service, Help Center, Documentation) - rendered as plain muted text
// rather than a dead link, same "don't fake it" convention this codebase
// already uses for not-yet-real functionality elsewhere.
function PlannedLink({ label }: { label: string }) {
  return <span className="text-muted small" style={{ cursor: 'default' }}>{label}</span>;
}

export default function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="border-top bg-white pt-5 pb-4">
      <Container>
        <Row className="g-4 mb-4">
          <Col xs={12} md={4}>
            <div className="d-flex align-items-center mb-2">
              <BrandMark variant="full" size={36} />
            </div>
            <p className="text-muted small mb-0">
              A modern examination platform for institutions, educators and learners.
            </p>
          </Col>

          <Col xs={6} md={2}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Product</div>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <a href="/#features" className="text-decoration-none text-dark small">
                  Features
                </a>
              </li>
              <li>
                <Link to="/exams" className="text-decoration-none text-dark small">
                  Exams
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-decoration-none text-dark small">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="/#security" className="text-decoration-none text-dark small">
                  Security
                </a>
              </li>
            </ul>
          </Col>

          <Col xs={6} md={2}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Company</div>
            <ul className="list-unstyled d-flex flex-column gap-2">
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
              <li>
                <PlannedLink label="Privacy Policy" />
              </li>
              <li>
                <PlannedLink label="Terms of Service" />
              </li>
            </ul>
          </Col>

          <Col xs={6} md={2}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Support</div>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li>
                <PlannedLink label="Help Center" />
              </li>
              <li>
                <PlannedLink label="Documentation" />
              </li>
              <li>
                <Link to="/contact" className="text-decoration-none text-dark small">
                  Contact Support
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={12} md={2}>
            <div className="fw-bold small text-uppercase text-muted mb-3">Stay Updated</div>
            <p className="text-muted small mb-2">Get the latest updates and news.</p>
            {subscribed ? (
              <p className="text-success small mb-3">Thanks for subscribing!</p>
            ) : (
              <Form
                className="d-flex gap-1 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubscribed(true);
                }}
              >
                <Form.Control
                  type="email"
                  required
                  size="sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm flex-shrink-0" aria-label="Subscribe">
                  &rarr;
                </button>
              </Form>
            )}
            <div className="d-flex gap-2">
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <SocialIcon>
                  <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.25h4V23h-4V8.25zM8.5 8.25h3.83v2.02h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.14V23h-4v-6.68c0-1.6-.03-3.65-2.22-3.65-2.23 0-2.57 1.74-2.57 3.54V23h-4V8.25z" />
                </SocialIcon>
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
                <SocialIcon>
                  <path d="M18.9 1.5h3.7l-8.1 9.3L24 22.5h-7.5l-5.9-7.7-6.7 7.7H0.2l8.7-9.9L0 1.5h7.7l5.3 7.1 5.9-7.1zm-1.3 18.8h2L6.5 3.6h-2.1l13.2 16.7z" />
                </SocialIcon>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
                <SocialIcon>
                  <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.5V8.5l6.3 3.5-6.3 3.5z" />
                </SocialIcon>
              </a>
            </div>
          </Col>
        </Row>

        <div className="border-top pt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span className="text-muted small">&copy; {year} ExamVault. All rights reserved.</span>
          <span className="text-muted small">Made for a smarter education future 💜</span>
        </div>
      </Container>
    </footer>
  );
}
