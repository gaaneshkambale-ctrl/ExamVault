import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { useTenants } from '../../hooks/useTenants';
import { useAuth } from '../../hooks/useAuth';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';
import { listAllSubmissions } from '../../api/submissionApi';
import { listPlans } from '../../api/plansApi';
import { listServiceStatus } from '../../api/monitoringApi';
import { timeAgo } from '../../utils/timeAgo';
import type { Tenant } from '../../types/tenant';
import type { ExamResponse } from '../../types/exam';

const REFRESH_INTERVAL_MS = 30000;

// Matches dashboard-superadmin.png. Total Organizations/Users/Exams/
// Submissions, Platform Overview's trend lines, Recent Organizations,
// Subscription Overview and System Health are all real now -
// listAllUsers/listExams already power the platform Users/Exams pages,
// listAllSubmissions (GET /api/submissions/all) is the same cross-tenant
// endpoint PlatformSubmissions.tsx uses, Tenant.isTrial/TrialEndsAtUtc is
// the real (non-billing) subscription-expiry model OrganizationsAndPlans.tsx
// established, and listServiceStatus already powers System Monitoring's
// Service Status page. The mockup's "Active Subscriptions" card is
// repointed at the platform's actual real subscription-adjacent metric
// (Trials Expiring Soon) instead of restating the Active Organizations
// count under a different name.
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

const SERVICE_STATUS_VARIANT: Record<string, string> = {
  Online: 'success',
  Degraded: 'warning',
  Offline: 'danger',
};

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function daysRemaining(trialEndsAtUtc: string): number {
  return Math.ceil((new Date(trialEndsAtUtc).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function PlatformDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: tenants, isLoading, isError, dataUpdatedAt } = useTenants();

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['platform-users'],
    queryFn: listAllUsers,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: allExams, isLoading: isLoadingExams } = useQuery({
    queryKey: ['platform-exams'],
    queryFn: listExams,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['platform-submissions'],
    queryFn: listAllSubmissions,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((t) => t.isActive).length ?? 0;
  const inactive = total - active;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const createdThisWeek = tenants?.filter((t) => new Date(t.createdAtUtc).getTime() >= oneWeekAgo).length ?? 0;
  const usersThisWeek = allUsers?.filter((u) => new Date(u.createdAtUtc).getTime() >= oneWeekAgo).length ?? 0;
  const examsThisWeek = allExams?.filter((e) => new Date(e.createdOn).getTime() >= oneWeekAgo).length ?? 0;

  const totalUsers = allUsers?.length ?? 0;
  const totalExams = allExams?.length ?? 0;
  const totalSubmissions = allSubmissions?.length ?? 0;
  const submissionsThisWeek = allSubmissions?.filter((s) => new Date(s.startedAtUtc).getTime() >= oneWeekAgo).length ?? 0;

  const expiringSoonCount = (tenants ?? []).filter(
    (t) => t.isTrial && t.trialEndsAtUtc && daysRemaining(t.trialEndsAtUtc) >= 0 && daysRemaining(t.trialEndsAtUtc) <= 30,
  ).length;

  const recentOrganizations: Tenant[] = [...(tenants ?? [])]
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
    .slice(0, 5);

  const topExams: ExamResponse[] = useMemo(() => {
    const list = [...(allExams ?? [])];
    list.sort((a, b) => {
      if (a.status === 'Published' && b.status !== 'Published') return -1;
      if (a.status !== 'Published' && b.status === 'Published') return 1;
      return new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime();
    });
    return list.slice(0, 5);
  }, [allExams]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const subscriptionBuckets = useMemo(() => {
    let activeCount = 0;
    let expiringSoon = 0;
    let expired = 0;
    (tenants ?? []).forEach((t) => {
      if (t.isTrial && t.trialEndsAtUtc) {
        const remaining = daysRemaining(t.trialEndsAtUtc);
        if (remaining < 0) expired += 1;
        else if (remaining <= 30) expiringSoon += 1;
        else activeCount += 1;
      } else {
        activeCount += 1;
      }
    });
    return { active: activeCount, expiringSoon, expired };
  }, [tenants]);

  const trendDays = useMemo(() => Array.from({ length: 7 }, (_, i) => endOfDay(new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000))), []);

  const overviewSeries = useMemo(
    () => [
      {
        name: 'Organizations',
        color: '#4f46e5',
        data: trendDays.map((d) => ({
          label: fmtDay(d),
          value: (tenants ?? []).filter((t) => new Date(t.createdAtUtc) <= d).length,
        })),
      },
      {
        name: 'Users',
        color: '#16a34a',
        data: trendDays.map((d) => ({
          label: fmtDay(d),
          value: (allUsers ?? []).filter((u) => new Date(u.createdAtUtc) <= d).length,
        })),
      },
      {
        name: 'Exams',
        color: '#d97706',
        data: trendDays.map((d) => ({
          label: fmtDay(d),
          value: (allExams ?? []).filter((e) => new Date(e.createdOn) <= d).length,
        })),
      },
      {
        name: 'Submissions',
        color: '#2563eb',
        data: trendDays.map((d) => ({
          label: fmtDay(d),
          value: (allSubmissions ?? []).filter((s) => new Date(s.startedAtUtc) <= d).length,
        })),
      },
    ],
    [trendDays, tenants, allUsers, allExams, allSubmissions],
  );

  const dateRangeLabel = `${fmtDay(trendDays[0])} - ${trendDays[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const dataAsOf = dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleString() : '—';

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    queryClient.invalidateQueries({ queryKey: ['platform-exams'] });
    queryClient.invalidateQueries({ queryKey: ['platform-submissions'] });
    queryClient.invalidateQueries({ queryKey: ['plans'] });
    queryClient.invalidateQueries({ queryKey: ['monitoring-services'] });
  };

  return (
    <PlatformLayout active="dashboard">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Dashboard</h1>
          <p className="text-muted mb-0">
            Welcome back, {user?.fullName ?? 'Super Admin'}! Here's what's happening on ExamVault.
          </p>
        </div>
        <span className="d-inline-flex align-items-center gap-2 border rounded-pill px-3 py-2 small text-muted bg-body">
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
              value={isLoadingUsers ? <Spinner animation="border" size="sm" /> : totalUsers}
              trend={usersThisWeek > 0 ? `+${usersThisWeek} this week` : undefined}
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
              value={isLoadingExams ? <Spinner animation="border" size="sm" /> : totalExams}
              trend={examsThisWeek > 0 ? `+${examsThisWeek} this week` : undefined}
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
              value={isLoadingSubmissions ? <Spinner animation="border" size="sm" /> : totalSubmissions}
              trend={submissionsThisWeek > 0 ? `+${submissionsThisWeek} this week` : undefined}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
            />
            <StatCard
              label="Trials Expiring Soon"
              value={expiringSoonCount}
              trend="Within next 30 days"
              iconBg="#fee2e2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Platform Overview</h2>
                  {isLoadingUsers || isLoadingExams || isLoadingSubmissions ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <LineTrendChart series={overviewSeries} />
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Overview (This Week)</h2>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Organizations</span>
                      <span>
                        <span className="fw-bold">{total}</span>{' '}
                        {createdThisWeek > 0 && <span className="text-success small">+{createdThisWeek}</span>}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Users</span>
                      <span>
                        <span className="fw-bold">{totalUsers}</span>{' '}
                        {usersThisWeek > 0 && <span className="text-success small">+{usersThisWeek}</span>}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Exams</span>
                      <span>
                        <span className="fw-bold">{totalExams}</span>{' '}
                        {examsThisWeek > 0 && <span className="text-success small">+{examsThisWeek}</span>}
                      </span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Recent Organizations</h2>
                    <Link to="/platform/organizations" className="small text-decoration-none">
                      View All
                    </Link>
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
                            {tenant.slug}.examvaults.in
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

            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Subscription Overview</h2>
                  {!plans ? (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <>
                      <SegmentDonutChart
                        centerLabel="Total"
                        segments={[
                          { label: 'Active', value: subscriptionBuckets.active, color: '#16a34a' },
                          { label: 'Expiring Soon', value: subscriptionBuckets.expiringSoon, color: '#2563eb' },
                          { label: 'Expired', value: subscriptionBuckets.expired, color: '#d97706' },
                        ]}
                      />
                      <div className="d-flex flex-column gap-1 mt-2 mb-3 small">
                        {[
                          { label: 'Active', value: subscriptionBuckets.active, color: '#16a34a' },
                          { label: 'Expiring Soon', value: subscriptionBuckets.expiringSoon, color: '#2563eb' },
                          { label: 'Expired', value: subscriptionBuckets.expired, color: '#d97706' },
                        ].map((row) => (
                          <div key={row.label} className="d-flex justify-content-between">
                            <span>
                              <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: row.color }} />
                              {row.label}
                            </span>
                            <span>
                              {row.value} ({total === 0 ? '0' : ((row.value / total) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <Link to="/platform/subscriptions/organizations" className="btn btn-outline-primary btn-sm w-100">
                    View All Subscriptions
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">System Health</h2>
                    <Link to="/platform/monitoring/service-status" className="small text-decoration-none">
                      View All
                    </Link>
                  </div>
                  {isLoadingServices ? (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (services ?? []).length === 0 ? (
                    <div className="text-center text-muted small py-4">No services reporting.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {(services ?? []).slice(0, 5).map((service) => (
                        <div key={service.name} className="d-flex justify-content-between align-items-center">
                          <span className="small">{service.name}</span>
                          <span className="d-flex align-items-center gap-2">
                            <Badge bg={SERVICE_STATUS_VARIANT[service.status] ?? 'secondary'}>{service.status}</Badge>
                            <span className="text-muted" style={{ fontSize: 12, minWidth: 40, textAlign: 'right' }}>
                              {service.responseTimeMs === null ? '—' : `${service.responseTimeMs}ms`}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 fw-bold mb-0">Top Active Exams</h2>
                <Link to="/platform/exams" className="small text-decoration-none">
                  View All Exams
                </Link>
              </div>
              {isLoadingExams ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : topExams.length === 0 ? (
                <div className="text-center text-muted small py-4">No exams yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="text-muted small text-uppercase">
                      <tr>
                        <th>Exam Name</th>
                        <th>Organization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topExams.map((exam) => (
                        <tr key={exam.id}>
                          <td className="fw-medium">{exam.title}</td>
                          <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                          <td>
                            <Badge
                              bg={exam.status === 'Published' ? 'success' : exam.status === 'Draft' ? 'warning' : 'secondary'}
                            >
                              {exam.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
            <span>
              {active} active · {inactive} inactive organization{total === 1 ? '' : 's'}
            </span>
            <span className="d-flex align-items-center gap-2">
              Data as of {dataAsOf}
              <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={refreshAll}>
                Refresh
              </Button>
            </span>
          </div>
        </>
      )}
    </PlatformLayout>
  );
}
