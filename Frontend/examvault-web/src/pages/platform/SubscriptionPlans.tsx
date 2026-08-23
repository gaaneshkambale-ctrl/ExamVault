import { Badge, Button, Card, Col, Row } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';

// Matches subscription.png's Plans screen. Deliberately a static
// reference pricing table, not a fake-persisted CRUD list - there's no
// Plan entity anywhere in this codebase (Subscriptions/billing stays out
// of scope per the original multi_tenant_saas.txt decision, reconfirmed
// with the user when this screen was requested). A table of "plan rows"
// with working-looking Edit/Delete buttons would misrepresent this as
// real, saved data more than a static pricing card does - so Create/Edit
// here are disabled with an explicit note instead.
interface PlanTier {
  name: string;
  badge?: string;
  price: string;
  cadence: string;
  features: string[];
}

const PLANS: PlanTier[] = [
  {
    name: 'Free Trial',
    badge: 'Trial',
    price: '₹0',
    cadence: '14 Days Trial',
    features: ['Up to 50 Students', '10 Exams', 'Basic Reports', 'Email Support'],
  },
  {
    name: 'Basic',
    badge: 'Popular',
    price: '₹999',
    cadence: 'Billed Monthly',
    features: ['Up to 500 Students', 'Unlimited Exams', 'Basic Reports', 'Email Support'],
  },
  {
    name: 'Standard',
    badge: 'Best Value',
    price: '₹2,499',
    cadence: 'Billed Monthly',
    features: ['Up to 2,000 Students', 'Unlimited Exams', 'Advanced Reports', 'Priority Email Support', 'Custom Branding'],
  },
  {
    name: 'Premium',
    badge: 'Enterprise',
    price: '₹4,999',
    cadence: 'Billed Monthly',
    features: ['Unlimited Students', 'Unlimited Exams', 'Advanced Reports', 'Priority Support', 'Custom Branding', 'API Access'],
  },
];

export default function SubscriptionPlans() {
  return (
    <PlatformLayout active="subs-plans">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Subscriptions / Plans</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Plans</h1>
          <p className="text-muted mb-0">Reference pricing tiers - plan management isn't connected yet.</p>
        </div>
        <Button variant="primary" disabled title="Not connected yet">
          + Create Plan
        </Button>
      </div>

      <div className="border rounded-3 bg-white p-3 mb-3 text-muted small">
        These cards are static reference tiers, not real backend-tracked plans - there's no Plan entity or
        organization-to-plan assignment in this codebase yet.
      </div>

      <Row className="g-3">
        {PLANS.map((plan) => (
          <Col key={plan.name} md={6} lg={3}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h2 className="h6 fw-bold mb-0">{plan.name}</h2>
                  {plan.badge && (
                    <Badge bg="light" text="dark" className="border">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <div className="h4 fw-bold mb-0">
                  {plan.price} <span className="fs-6 text-muted fw-normal">/ month</span>
                </div>
                <div className="text-muted small mb-3">{plan.cadence}</div>
                <ul className="list-unstyled small flex-grow-1 mb-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="mb-1 d-flex align-items-start gap-2">
                      <span className="text-success">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline-secondary" size="sm" disabled title="Not connected yet">
                  Edit Plan
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </PlatformLayout>
  );
}
