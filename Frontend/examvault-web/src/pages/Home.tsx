import type { ReactNode } from 'react';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import type { AuthMode } from '../components/AuthModal';

function Icon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function IconBadge({ children, bg, color }: { children: ReactNode; bg: string; color: string }) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3 flex-shrink-0"
      style={{ width: 44, height: 44, background: bg }}
    >
      <Icon color={color}>{children}</Icon>
    </span>
  );
}

interface Chip {
  label: string;
  icon: ReactNode;
}

const heroChips: Chip[] = [
  { label: 'Easy to Use', icon: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" /> },
  { label: 'Secure & Reliable', icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /> },
  {
    label: 'Real-time Results',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
  },
];

const trustChips: Chip[] = [
  { label: 'AI-Powered Question Generation', icon: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" /> },
  {
    label: 'Real-Time Grading',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
  },
  { label: 'Secure Authentication', icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /> },
  { label: 'Role-Based Access', icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></> },
];

interface Feature {
  title: string;
  description: string;
  bg: string;
  color: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    title: 'Easy Exam Creation',
    description: 'Create exams in minutes with multiple question types.',
    bg: '#eef2ff',
    color: '#4f46e5',
    icon: <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
  },
  {
    title: 'User Management',
    description: 'Manage students, groups and permissions with ease.',
    bg: '#ecfdf5',
    color: '#0d9488',
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
  },
  {
    title: 'Real-time Results',
    description: 'Get instant results and detailed performance analytics.',
    bg: '#eff6ff',
    color: '#2563eb',
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  },
  {
    title: 'Secure & Reliable',
    description: 'Advanced security keeps exams fair and trusted.',
    bg: '#fff7ed',
    color: '#ea580c',
    icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
  },
  {
    title: 'Accessible Anywhere',
    description: 'Take exams anytime, anywhere, on any device.',
    bg: '#eef2ff',
    color: '#4f46e5',
    icon: <><rect x="2" y="4" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" /></>,
  },
];

interface Audience {
  title: string;
  description: string;
  bg: string;
  color: string;
  icon: ReactNode;
}

const audiences: Audience[] = [
  {
    title: 'For Institutions',
    description: 'Schools, colleges and universities can conduct exams securely and efficiently.',
    bg: '#eef2ff',
    color: '#4f46e5',
    icon: <><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></>,
  },
  {
    title: 'For Educators',
    description: 'Create assessments, track performance and improve learning outcomes.',
    bg: '#ecfdf5',
    color: '#0d9488',
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></>,
  },
  {
    title: 'For Students',
    description: 'Take exams, view results and track your progress in one place.',
    bg: '#fff7ed',
    color: '#ea580c',
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  },
];

const banner: Chip[] = [
  { label: 'AI Question Generator', icon: <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" /> },
  { label: 'Multiple Question Types', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></> },
  { label: 'Detailed Analytics', icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></> },
  { label: 'Free to Get Started', icon: <><polyline points="20 6 9 17 4 12" /></> },
];

function HeroVisual() {
  return (
    <div className="position-relative">
      <svg width="100%" height="auto" viewBox="0 0 420 340" fill="none" aria-hidden="true">
        <circle cx="230" cy="170" r="150" fill="#eef2ff" />
        <rect x="90" y="120" width="220" height="150" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="2" />
        <rect x="90" y="120" width="220" height="28" rx="14" fill="#eef2ff" />
        <circle cx="106" cy="134" r="4" fill="#c7d2fe" />
        <circle cx="120" cy="134" r="4" fill="#c7d2fe" />
        <circle cx="134" cy="134" r="4" fill="#c7d2fe" />
        <rect x="110" y="166" width="180" height="10" rx="5" fill="#e0e7ff" />
        <rect x="110" y="186" width="180" height="8" rx="4" fill="#eef2ff" />
        <rect x="110" y="202" width="140" height="8" rx="4" fill="#eef2ff" />
        <rect x="110" y="230" width="80" height="26" rx="8" fill="#4f46e5" />
        <path d="M136 243l6 6 12-12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="60" y="280" width="300" height="14" rx="7" fill="#c7d2fe" />
      </svg>

      <div
        className="position-absolute bg-white rounded-3 p-3 d-flex align-items-center gap-2"
        style={{ top: 8, right: -12, boxShadow: 'var(--shadow-soft-hover)', maxWidth: 190 }}
      >
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: '#ecfdf5' }}>
          <Icon color="#0d9488">
            <polyline points="20 6 9 17 4 12" />
          </Icon>
        </span>
        <div>
          <div className="fw-bold small">Instant Grading</div>
          <div className="text-muted" style={{ fontSize: 11 }}>Auto-scored on submit</div>
        </div>
      </div>

      <div
        className="position-absolute bg-white rounded-3 p-3 d-flex align-items-center gap-2"
        style={{ bottom: 20, left: -16, boxShadow: 'var(--shadow-soft-hover)', maxWidth: 200 }}
      >
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, background: '#eef2ff' }}>
          <Icon color="#4f46e5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </Icon>
        </span>
        <div>
          <div className="fw-bold small">Real-Time Results</div>
          <div className="text-muted" style={{ fontSize: 11 }}>See performance instantly</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode: AuthMode | null =
    location.pathname === '/login' ? 'login' : location.pathname === '/register' ? 'register' : null;

  return (
    <div>
      <NavBar />

      <Container className="pt-5 pb-4">
        <Row className="align-items-center g-5">
          <Col lg={6}>
            <span className="badge rounded-pill mb-3" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              Smart Exams. Better Results.
            </span>
            <h1 className="display-5 fw-bold mb-3">
              The Smarter Way to
              <br />
              <span style={{ color: '#4f46e5' }}>Create, Assess &amp; Succeed</span>
            </h1>
            <p className="text-muted fs-5 mb-4">
              ExamVault is a secure and intelligent online examination platform for institutions, educators
              and learners. Create exams, evaluate instantly and achieve more.
            </p>
            <div className="d-flex flex-wrap gap-3 mb-4">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started for Free
              </Link>
              <Button as="a" href="#features" variant="outline-secondary" size="lg">
                View Features
              </Button>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span
                  key={chip.label}
                  className="d-inline-flex align-items-center gap-2 border rounded-3 px-3 py-2 small fw-medium"
                >
                  <Icon color="#4f46e5">{chip.icon}</Icon>
                  {chip.label}
                </span>
              ))}
            </div>
          </Col>
          <Col lg={6}>
            <HeroVisual />
          </Col>
        </Row>
      </Container>

      <Container className="pb-5">
        <Row className="g-4 bg-white border rounded-4 shadow-sm p-4 mx-0">
          {trustChips.map((chip) => (
            <Col key={chip.label} xs={6} md={3} className="d-flex align-items-center gap-2">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{ width: 36, height: 36, background: '#eef2ff' }}
              >
                <Icon color="#4f46e5">{chip.icon}</Icon>
              </span>
              <span className="fw-medium small">{chip.label}</span>
            </Col>
          ))}
        </Row>
      </Container>

      <Container id="features" className="pb-5">
        <div className="text-center mb-5">
          <h2 className="fw-bold">Powerful Features</h2>
          <p className="text-muted">Everything you need to create, manage and analyze exams seamlessly.</p>
        </div>
        <Row className="g-4">
          {features.map((feature) => (
            <Col key={feature.title} sm={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <IconBadge bg={feature.bg} color={feature.color}>
                    {feature.icon}
                  </IconBadge>
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

      <Container className="pb-5">
        <div className="text-center mb-5">
          <h2 className="fw-bold">Built for Everyone</h2>
          <p className="text-muted">ExamVault is trusted by a wide range of users.</p>
        </div>
        <Row className="g-4">
          {audiences.map((audience) => (
            <Col key={audience.title} md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="d-flex gap-3">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 48, height: 48, background: audience.bg }}
                  >
                    <Icon color={audience.color}>{audience.icon}</Icon>
                  </span>
                  <div>
                    <Card.Title as="h6" className="fw-bold">
                      {audience.title}
                    </Card.Title>
                    <Card.Text className="text-muted small mb-0">{audience.description}</Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <Container fluid className="px-0">
        <div style={{ background: 'linear-gradient(90deg, #4f46e5, #4338ca)' }} className="py-4">
          <Container>
            <Row className="g-4">
              {banner.map((item) => (
                <Col key={item.label} xs={6} md={3} className="d-flex align-items-center gap-2 text-white">
                  <Icon color="white">{item.icon}</Icon>
                  <span className="fw-medium small">{item.label}</span>
                </Col>
              ))}
            </Row>
          </Container>
        </div>
      </Container>

      <Footer />

      {mode && <AuthModal mode={mode} onClose={() => navigate('/')} />}
    </div>
  );
}
