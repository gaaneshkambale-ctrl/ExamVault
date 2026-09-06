import { useState } from 'react';
import type { FormEvent } from 'react';
import { Col, Container, Form, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import { subscribeToNewsletter } from '../api/newsletterApi';
import { extractServerError } from '../utils/apiError';

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      await subscribeToNewsletter(email.trim());
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(extractServerError(error, {}, "Couldn't subscribe right now. Please try again."));
    }
  };

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
                <a href="/#exam-management" className="text-decoration-none text-dark small">
                  Exams
                </a>
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
            {status === 'success' ? (
              <p className="text-success small mb-3">Thanks for subscribing!</p>
            ) : (
              <>
                <Form className="d-flex gap-1 mb-2" onSubmit={handleSubscribe}>
                  <Form.Control
                    type="email"
                    required
                    size="sm"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm flex-shrink-0"
                    aria-label="Subscribe"
                    disabled={status === 'loading'}
                  >
                    &rarr;
                  </button>
                </Form>
                {status === 'error' && <p className="text-danger small mb-3">{errorMessage}</p>}
              </>
            )}
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
