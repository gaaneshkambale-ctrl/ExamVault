import type { ReactNode } from 'react';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import AuthModal from '../components/AuthModal';
import type { AuthMode } from '../components/AuthModal';

function HeroIllustration() {
  return (
    <svg width="100%" height="auto" viewBox="0 0 320 260" fill="none" aria-hidden="true">
      <rect x="40" y="20" width="200" height="140" rx="12" fill="#eef2ff" />
      <rect x="60" y="40" width="160" height="100" rx="6" fill="white" stroke="#c7d2fe" />
      <rect x="76" y="56" width="80" height="8" rx="4" fill="#a5b4fc" />
      <rect x="76" y="74" width="128" height="6" rx="3" fill="#e0e7ff" />
      <rect x="76" y="88" width="128" height="6" rx="3" fill="#e0e7ff" />
      <rect x="76" y="102" width="90" height="6" rx="3" fill="#e0e7ff" />
      <circle cx="184" cy="60" r="10" fill="#4f46e5" />
      <path d="M180 60l3 3 6-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="120" y="160" width="40" height="10" rx="2" fill="#c7d2fe" />
      <rect x="90" y="170" width="100" height="8" rx="4" fill="#e0e7ff" />
      <circle cx="250" cy="70" r="26" fill="#eef2ff" />
      <path
        d="M238 66l12-6 12 6-12 6-12-6zM238 66v10l12 6 12-6V66"
        stroke="#4338ca"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    title: 'Easy to Use',
    description: 'User friendly interface for all users.',
    icon: (
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0"
        stroke="#0d9488"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: 'Secure',
    description: 'Secure authentication and data protection.',
    icon: (
      <path
        d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"
        stroke="#0d9488"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: 'Real-time Results',
    description: 'Instant evaluation and result generation.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" stroke="#0d9488" strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    title: 'AI Powered',
    description: 'AI generated questions and smart evaluation.',
    icon: (
      <path
        d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z"
        stroke="#0d9488"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode: AuthMode | null =
    location.pathname === '/login' ? 'login' : location.pathname === '/register' ? 'register' : null;

  return (
    <div>
      <NavBar />

      <Container className="py-5">
        <Row className="align-items-center g-5">
          <Col md={6}>
            <h1 className="display-5 fw-bold mb-3">Smart Online Examination System</h1>
            <p className="text-muted fs-5 mb-4">
              Create, manage and take exams online with ease and security.
            </p>
            <div className="d-flex gap-3">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <Button variant="outline-primary" size="lg">
                Learn More
              </Button>
            </div>
          </Col>
          <Col md={6}>
            <HeroIllustration />
          </Col>
        </Row>
      </Container>

      <Container id="features" className="pb-5">
        <Row className="g-4">
          {features.map((feature) => (
            <Col key={feature.title} md={3} sm={6}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: 44, height: 44, background: '#ccfbf1' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      {feature.icon}
                    </svg>
                  </span>
                  <Card.Title as="h6" className="fw-bold">
                    {feature.title}
                  </Card.Title>
                  <Card.Text className="text-muted small">{feature.description}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {mode && <AuthModal mode={mode} onClose={() => navigate('/')} />}
    </div>
  );
}
