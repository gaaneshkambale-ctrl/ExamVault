import { Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const PURPLE = '#4f46e5';

interface PlanTier {
  key: string;
  eyebrow: string;
  eyebrowBg: string;
  eyebrowColor: string;
  name: string;
  price: string;
  priceSuffix?: string;
  billingNote?: { text: string; savings: string };
  period?: string;
  description: string;
  features: string[];
  cta: { label: string; to: string; variant: 'outline-primary' | 'primary' | 'outline-dark' };
  footNote?: string;
  highlighted?: boolean;
}

const PLANS: PlanTier[] = [
  {
    key: 'free',
    eyebrow: 'Free Forever',
    eyebrowBg: '#dcfce7',
    eyebrowColor: '#16a34a',
    name: 'Free',
    price: '₹0',
    period: 'Forever',
    description: 'Perfect for individuals and small trainers getting started.',
    features: [
      'Up to 5 active exams',
      'Up to 100 students',
      'AI-powered question generation (Up to 50 questions/month)',
      '5 question types',
      'Basic reports & analytics',
      'Email notifications (Limited)',
      'Secure role-based access',
      '24/7 Community support',
    ],
    cta: { label: 'Get Started Free', to: '/register', variant: 'outline-primary' },
  },
  {
    key: 'professional',
    eyebrow: 'For Colleges & Institutes',
    eyebrowBg: '#eef2ff',
    eyebrowColor: PURPLE,
    name: 'Professional',
    price: '₹999',
    priceSuffix: '/month',
    billingNote: { text: 'Billed annually at ₹9,999/year', savings: '(Save ₹1,989)' },
    description: 'Everything you need to conduct and analyze exams efficiently.',
    features: [
      'Up to 100 active exams',
      'Up to 1,000 students',
      'AI-powered question generation (Up to 1,000 questions/month)',
      'All question types',
      'Advanced reports & analytics',
      'AI exam generation',
      'PDF/Excel export',
      'Custom branding',
      'Email notifications',
      'Basic proctoring',
      'Priority email & chat support',
    ],
    cta: { label: 'Start 7-Day Free Trial', to: '/register', variant: 'primary' },
    footNote: 'No credit card required',
    highlighted: true,
  },
  {
    key: 'business',
    eyebrow: 'For Organizations & Companies',
    eyebrowBg: '#eef2ff',
    eyebrowColor: '#2563eb',
    name: 'Business',
    price: '₹2,999',
    priceSuffix: '/month',
    billingNote: { text: 'Billed annually at ₹29,999/year', savings: '(Save ₹5,989)' },
    description: 'Advanced features and security for large organizations.',
    features: [
      'Unlimited active exams',
      'Unlimited students',
      'AI-powered question generation (Up to 10,000 questions/month)',
      'All question types',
      'Advanced reports & analytics',
      'AI exam generation',
      'Advanced proctoring',
      'Custom branding & domains',
      'SSO (Single Sign-On)',
      'API access',
      'Dedicated account manager',
      'Priority support',
      '99.9% uptime SLA',
    ],
    cta: { label: 'Contact Sales', to: '/contact', variant: 'outline-primary' },
  },
];

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-9.36L1 10" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2v1Z" />
      <path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2v1Z" />
      <path d="M17 17v1a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="10" y1="22" x2="10" y2="18" />
      <line x1="14" y1="22" x2="14" y2="18" />
    </svg>
  );
}

const TRUST_ITEMS = [
  { icon: <ShieldIcon />, title: 'Secure & Reliable', subtitle: 'Enterprise-grade security' },
  { icon: <CancelIcon />, title: 'Cancel Anytime', subtitle: 'No commitments' },
  { icon: <HeadsetIcon />, title: 'Need Help?', subtitle: "We're here for you" },
];

export default function Pricing() {
  return (
    <div>
      <NavBar />

      <Container className="py-5">
        <div className="text-center mb-5">
          <span className="badge rounded-pill mb-3 px-3 py-2" style={{ background: '#eef2ff', color: PURPLE, fontWeight: 500 }}>
            Simple, Transparent Pricing
          </span>
          <h1 className="fw-bold display-5">Choose the plan that's right for you</h1>
          <p className="text-muted fs-5 mb-0">No hidden fees. No credit card required. Cancel anytime.</p>
        </div>

        <Row className="justify-content-center g-4">
          {PLANS.map((plan) => (
            <Col xs={12} md={6} lg={4} key={plan.key} className="d-flex">
              <Card
                className={`border-0 shadow-sm w-100 position-relative ${plan.highlighted ? 'shadow-lg' : ''}`}
                style={plan.highlighted ? { border: `2px solid ${PURPLE}` } : undefined}
              >
                {plan.highlighted && (
                  <div
                    className="position-absolute top-0 start-50 translate-middle badge rounded-pill px-3 py-2 d-flex align-items-center gap-1"
                    style={{ background: PURPLE, color: 'white', fontWeight: 600 }}
                  >
                    ★ Most Popular
                  </div>
                )}
                <Card.Body className="p-4 d-flex flex-column" style={{ paddingTop: plan.highlighted ? '2.5rem' : undefined }}>
                  <span
                    className="badge rounded-pill mb-3 align-self-start px-3 py-2"
                    style={{ background: plan.eyebrowBg, color: plan.eyebrowColor, fontWeight: 500 }}
                  >
                    {plan.eyebrow}
                  </span>

                  <h3 className="fw-bold mb-2">{plan.name}</h3>

                  <div className="d-flex align-items-baseline gap-1 mb-1">
                    <span className="display-5 fw-bold" style={{ color: plan.highlighted ? PURPLE : undefined }}>
                      {plan.price}
                    </span>
                    {plan.priceSuffix && <span className="text-muted">{plan.priceSuffix}</span>}
                  </div>

                  {plan.period && <p className="text-muted mb-3">{plan.period}</p>}
                  {plan.billingNote && (
                    <p className="text-muted small mb-3">
                      {plan.billingNote.text} <span className="text-success fw-medium">{plan.billingNote.savings}</span>
                    </p>
                  )}

                  <p className="text-muted mb-3">{plan.description}</p>

                  <hr />

                  <ul className="list-unstyled text-start mb-4 flex-grow-1">
                    {plan.features.map((item) => (
                      <li key={item} className="d-flex align-items-start gap-2 mb-2">
                        <CheckIcon color={plan.highlighted ? PURPLE : '#22c55e'} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={plan.cta.to} className={`btn btn-${plan.cta.variant} btn-lg w-100`}>
                    {plan.cta.label}
                  </Link>

                  {plan.footNote && (
                    <p className="text-muted small text-center mt-2 mb-0 d-flex align-items-center justify-content-center gap-1">
                      🛡 {plan.footNote}
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Row className="justify-content-center text-center mt-5 g-4">
          {TRUST_ITEMS.map((item) => (
            <Col xs={12} sm={4} key={item.title} className="d-flex align-items-center justify-content-center gap-3">
              {item.icon}
              <div className="text-start">
                <div className="fw-semibold">{item.title}</div>
                <div className="text-muted small">{item.subtitle}</div>
              </div>
            </Col>
          ))}
        </Row>

        <div className="border rounded-4 p-4 mt-5 d-flex align-items-center justify-content-center gap-3 flex-wrap text-center">
          <BuildingIcon />
          <span className="text-muted">
            Need a custom plan for 5,000+ students or multiple organizations?{' '}
            <Link to="/contact" style={{ color: PURPLE, fontWeight: 500 }}>
              Contact our sales team
            </Link>{' '}
            for special pricing.
          </span>
        </div>
      </Container>

      <Footer />
    </div>
  );
}
