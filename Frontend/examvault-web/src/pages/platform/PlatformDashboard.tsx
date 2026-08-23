import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../utils/timeAgo';
import type { Tenant } from '../../types/tenant';

// Matches Super_admin_dashboard.png's stat-card row: only "Total
// Organizations" has a real cross-tenant backend today (the existing
// tenant list). Total Users/Exams/Submissions and Active Subscriptions
// would each need a new cross-tenant aggregate endpoint (Users/Exams) or
// the still-deferred Subscriptions model - shown honestly as "not
// connected yet" rather than a fabricated number, matching this
// project's established convention.
function StatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: ReactNode;
  trend?: string;
}) {
  return (
    <Col>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex gap-3 align-items-start">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: iconBg }}
          >
            {icon}
          </span>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">{value}</div>
            {trend && <div className="small text-success mt-1">{trend}</div>}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function NotConnectedCard({ title }: { title: string }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <h2 className="h6 fw-bold mb-3">{title}</h2>
        <div className="text-center text-muted small py-4">Not connected yet.</div>
      </Card.Body>
    </Card>
  );
}

export default function PlatformDashboard() {
  const { user } = useAuth();
  const { data: tenants, isLoading, isError } = useTenants();

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((t) => t.isActive).length ?? 0;
  const inactive = total - active;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const createdThisWeek = tenants?.filter((t) => new Date(t.createdAtUtc).getTime() >= oneWeekAgo).length ?? 0;

  const recentOrganizations: Tenant[] = [...(tenants ?? [])]
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
    .slice(0, 5);

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const dateRangeLabel = `${weekAgo.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <PlatformLayout active="dashboard">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Dashboard</h1>
          <p className="text-muted mb-0">
            Welcome back, {user?.fullName ?? 'Super Admin'}! Here's what's happening on ExamVault.
          </p>
        </div>
        <span className="d-inline-flex align-items-center gap-2 border rounded-pill px-3 py-2 small text-muted bg-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {dateRangeLabel}
        </span>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load platform stats. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={5} className="g-3 mb-3">
            <StatCard
              label="Total Organizations"
              value={total}
              trend={createdThisWeek > 0 ? `+${createdThisWeek} this week` : undefined}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                </svg>
              }
            />
            <StatCard
              label="Total Users"
              value="—"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Total Exams"
              value="—"
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Total Submissions"
              value="—"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
            />
            <StatCard
              label="Active Subscriptions"
              value="—"
              iconBg="#fee2e2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Platform Overview</h2>
                  <div className="d-flex align-items-center gap-4 flex-wrap mb-2 small">
                    <span>
                      <span className="d-inline-block rounded-circle bg-primary me-2" style={{ width: 8, height: 8 }} />
                      Organizations
                    </span>
                    <span className="text-muted">
                      <span className="d-inline-block rounded-circle bg-secondary-subtle me-2" style={{ width: 8, height: 8 }} />
                      Users - not connected yet
                    </span>
                    <span className="text-muted">
                      <span className="d-inline-block rounded-circle bg-secondary-subtle me-2" style={{ width: 8, height: 8 }} />
                      Exams - not connected yet
                    </span>
                    <span className="text-muted">
                      <span className="d-inline-block rounded-circle bg-secondary-subtle me-2" style={{ width: 8, height: 8 }} />
                      Submissions - not connected yet
                    </span>
                  </div>
                  <div className="text-center text-muted small py-5 border rounded-3">
                    Organization growth trend needs more history to chart - only {total} organization{total === 1 ? '' : 's'} exist today.
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Recent Organizations</h2>
                    <a href="/platform/organizations" className="small text-decoration-none">
                      View All
                    </a>
                  </div>
                  {recentOrganizations.length === 0 && (
                    <div className="text-center text-muted small py-4">No organizations yet.</div>
                  )}
                  <div className="d-flex flex-column gap-3">
                    {recentOrganizations.map((tenant) => (
                      <div key={tenant.id} className="d-flex align-items-center gap-3">
                        <OrgAvatar name={tenant.name} />
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="fw-medium text-truncate small">{tenant.name}</div>
                          <div className="text-muted text-truncate" style={{ fontSize: 12 }}>
                            {tenant.slug}.examvault.com
                          </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <span className={`badge bg-${tenant.isActive ? 'success' : 'secondary'} bg-opacity-25 text-${tenant.isActive ? 'success' : 'secondary'} mb-1`}>
                            {tenant.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {timeAgo(tenant.createdAtUtc)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={4}>
              <NotConnectedCard title="Subscription Overview" />
            </Col>
            <Col md={4}>
              <NotConnectedCard title="Top Active Exams" />
            </Col>
            <Col md={4}>
              <NotConnectedCard title="System Health" />
            </Col>
          </Row>

          <div className="text-muted small mt-3">
            {active} active · {inactive} inactive organization{total === 1 ? '' : 's'}
          </div>
        </>
      )}
    </PlatformLayout>
  );
}
