import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';

// Matches reports.png's Organization Report screen. Real - Total/Active
// Organizations and the Status donut reuse the same tenant list every
// other Organizations page already uses (no Trial concept exists here,
// same as ManageTenants/PlatformDashboard). Top Organizations by Users is
// a new derived-real widget: groups the existing cross-tenant AllUsers
// list by tenantId and counts, rather than fetching anything new.
function StatCard({ icon, iconBg, label, value }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode }) {
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
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function OrganizationReport() {
  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError } = useTenants();
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((t) => t.isActive).length ?? 0;
  const inactive = total - active;

  const topOrganizations = useMemo(() => {
    const counts = new Map<string, number>();
    (users ?? []).forEach((u) => counts.set(u.tenantId, (counts.get(u.tenantId) ?? 0) + 1));
    return [...counts.entries()]
      .map(([tenantId, count]) => ({
        tenantId,
        name: tenants?.find((t) => t.id === tenantId)?.name ?? 'Unknown organization',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [users, tenants]);

  const isLoading = tenantsLoading || usersLoading;

  return (
    <PlatformLayout active="reports-org">
      <p className="text-muted small mb-1">Platform Admin / Reports / Organization Report</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Organization Report</h1>
      <p className="text-muted mb-3">Overview of organizations across the platform.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {tenantsError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

      {!isLoading && !tenantsError && (
        <>
          <Row xs={1} sm={2} lg={3} className="g-3 mb-3">
            <StatCard
              label="Total Organizations"
              value={total}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                </svg>
              }
            />
            <StatCard
              label="Active Organizations"
              value={active}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
            />
            <StatCard
              label="Inactive Organizations"
              value={inactive}
              iconBg="#f3f4f6"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3">
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Organization Status</h2>
                  <SegmentDonutChart
                    centerLabel="Total"
                    segments={[
                      { label: 'Active', value: active, color: '#16a34a' },
                      { label: 'Inactive', value: inactive, color: '#6b7280' },
                    ]}
                  />
                  <div className="d-flex flex-column gap-1 mt-2 small">
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#16a34a' }} />
                        Active
                      </span>
                      <span>{active}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#6b7280' }} />
                        Inactive
                      </span>
                      <span>{inactive}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Top Organizations by Users</h2>
                  {topOrganizations.length === 0 && (
                    <div className="text-center text-muted small py-4">No users yet.</div>
                  )}
                  <div className="d-flex flex-column gap-2">
                    {topOrganizations.map((org) => (
                      <div key={org.tenantId} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                        <span className="fw-medium">{org.name}</span>
                        <span className="text-muted">{org.count} user{org.count === 1 ? '' : 's'}</span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PlatformLayout>
  );
}
