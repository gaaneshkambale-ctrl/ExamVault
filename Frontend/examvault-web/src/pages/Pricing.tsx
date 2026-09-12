import { Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { listPublicPlans } from '../api/plansApi';
import { PLAN_FEATURE_LABELS } from '../types/plan';
import type { Plan } from '../types/plan';

const PURPLE = '#4f46e5';

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

// Real data from GET /api/plans/public - same source and the same honesty
// rule Home.tsx's own pricing teaser already follows: no hardcoded prices/
// features, and no "Most Popular" badge (Plan has no real "featured" field
// to back one). Whenever an Admin edits a real Plan in the Platform Admin
// console, this page and Home's teaser now show the exact same numbers
// instead of silently drifting apart.
function planPriceDisplay(plan: Plan): { price: string; period: string } {
  if (plan.monthlyPrice === null) {
    return { price: 'Custom Pricing', period: 'Talk to our team' };
  }
  if (plan.monthlyPrice === 0) {
    return { price: '₹0', period: 'Forever free' };
  }
  const period =
    plan.annualPrice !== null
      ? `/ month (₹${plan.annualPrice.toLocaleString('en-IN')} / year)`
      : '/ month';
  return { price: `₹${plan.monthlyPrice.toLocaleString('en-IN')}`, period };
}

function planBullets(plan: Plan): string[] {
  return [
    `${plan.maxStudents === null ? 'Unlimited' : plan.maxStudents.toLocaleString('en-IN')} students`,
    `${plan.maxExams === null ? 'Unlimited' : plan.maxExams.toLocaleString('en-IN')} exams`,
    ...plan.includedFeatures.map((f) => PLAN_FEATURE_LABELS[f]),
  ];
}

function planCta(plan: Plan): { label: string; to: string } {
  return plan.monthlyPrice === null && plan.annualPrice === null
    ? { label: 'Contact Sales', to: '/contact' }
    : { label: 'Get Started', to: '/register' };
}

function sortByPrice(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => (a.monthlyPrice ?? Infinity) - (b.monthlyPrice ?? Infinity));
}

export default function Pricing() {
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ['public-plans'], queryFn: listPublicPlans });

  return (
    <div>
      <NavBar />

      <Container className="py-5">
        <div className="text-center mb-5">
          <span className="badge rounded-pill mb-3 px-3 py-2" style={{ background: '#eef2ff', color: PURPLE, fontWeight: 500 }}>
            Simple, Transparent Pricing
          </span>
          <h1 className="fw-bold display-5">Choose the plan that's right for you</h1>
          <p className="text-muted fs-5 mb-0">No hidden fees. Cancel anytime.</p>
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" />
          </div>
        )}

        {isError && (
          <div className="text-center text-danger py-4">Couldn't load pricing right now. Please try again shortly.</div>
        )}

        {!isLoading && !isError && plans && plans.length === 0 && (
          <div className="text-center text-muted py-4">Pricing plans are being finalized - check back soon.</div>
        )}

        {!isLoading && !isError && plans && plans.length > 0 && (
          <Row className="justify-content-center g-4">
            {sortByPrice(plans).map((plan) => {
              const { price, period } = planPriceDisplay(plan);
              const cta = planCta(plan);
              const bullets = planBullets(plan);
              return (
                <Col xs={12} md={6} lg={4} key={plan.id} className="d-flex">
                  <Card className="border-0 shadow-sm w-100 position-relative">
                    <Card.Body className="p-4 d-flex flex-column">
                      <h3 className="fw-bold mb-2">{plan.name}</h3>
                      <p className="text-muted mb-3">{plan.description ?? ' '}</p>

                      <div className="d-flex align-items-baseline gap-1 mb-1">
                        <span className="display-6 fw-bold">{price}</span>
                      </div>
                      <p className="text-muted mb-3">{period}</p>

                      <hr />

                      <ul className="list-unstyled text-start mb-4 flex-grow-1">
                        {bullets.map((item) => (
                          <li key={item} className="d-flex align-items-start gap-2 mb-2">
                            <CheckIcon color="#22c55e" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <Link to={cta.to} className="btn btn-outline-primary btn-lg w-100">
                        {cta.label}
                      </Link>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

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
            Need a custom plan for a large organization or multiple institutions?{' '}
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
