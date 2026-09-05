import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';
import { listPlans } from '../../api/plansApi';
import { listAllSubmissions } from '../../api/submissionApi';
import { bucketByDay, getDefaultRange } from '../../utils/dateRange';

// Matches subscription.png's Usage screen. Total Students, Exams
// Conducted, and Active Exams are all real now - the last two only became
// possible once this session's own Submissions work added a genuine
// cross-tenant GET /api/submissions/all (Exams Conducted = actual
// completed attempts, not just authored exams). Usage Overview, Top
// Organizations by Usage, and Usage by Plan are all real client-side
// cross-tenant joins too, the same pattern every other Platform list page
// already uses. Storage Used and API Calls stay honest "—" placeholders -
// neither is metered anywhere in this codebase.
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

function limitCell(used: number, max: number | null): string {
  return max === null ? `${used} / ∞` : `${used} / ${max}`;
}

export default function PlatformUsage() {
  const { data: tenants, isLoading: isLoadingTenants, isError: isErrorTenants } = useTenants();
  const { data: users, isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery({
    queryKey: ['platform-users'],
    queryFn: listAllUsers,
  });
  const { data: exams, isLoading: isLoadingExams, isError: isErrorExams } = useQuery({
    queryKey: ['platform-exams'],
    queryFn: listExams,
  });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: submissions } = useQuery({ queryKey: ['platform-submissions'], queryFn: listAllSubmissions });

  const isLoading = isLoadingTenants || isLoadingUsers || isLoadingExams;
  const isError = isErrorTenants || isErrorUsers || isErrorExams;

  const totalStudents = (users ?? []).filter((u) => u.role === 'Student').length;
  const completedSubmissions = (submissions ?? []).filter((s) => s.status === 'Submitted' || s.status === 'AutoSubmitted').length;
  const activeExams = (exams ?? []).filter((e) => e.status === 'Published').length;

  const range = useMemo(() => getDefaultRange(7), []);
  const trendSeries = useMemo(
    () => [
      {
        name: 'New Exams',
        color: '#d97706',
        data: bucketByDay((exams ?? []).map((e) => e.createdOn), range).map((b) => ({ label: b.label, value: b.count })),
      },
      {
        name: 'Submissions',
        color: '#4f46e5',
        data: bucketByDay((submissions ?? []).map((s) => s.startedAtUtc), range).map((b) => ({ label: b.label, value: b.count })),
      },
    ],
    [exams, submissions, range],
  );

  const topOrganizations = useMemo(() => {
    return (tenants ?? [])
      .map((t) => {
        const studentCount = (users ?? []).filter((u) => u.tenantId === t.id && u.role === 'Student').length;
        const examCount = (exams ?? []).filter((e) => e.tenantId === t.id).length;
        const submissionCount = (submissions ?? []).filter((s) => s.tenantId === t.id).length;
        return { tenant: t, studentCount, examCount, submissionCount, total: studentCount + examCount + submissionCount };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [tenants, users, exams, submissions]);

  const usageByPlan = useMemo(() => {
    return (plans ?? []).map((plan) => {
      const tenantsOnPlan = (tenants ?? []).filter((t) => t.planId === plan.id);
      const tenantIds = new Set(tenantsOnPlan.map((t) => t.id));
      const studentsUsed = (users ?? []).filter((u) => tenantIds.has(u.tenantId) && u.role === 'Student').length;
      const adminsUsed = (users ?? []).filter((u) => tenantIds.has(u.tenantId) && u.role === 'Admin').length;
      const instructorsUsed = (users ?? []).filter((u) => tenantIds.has(u.tenantId) && u.role === 'Instructor').length;
      const examsUsed = (exams ?? []).filter((e) => tenantIds.has(e.tenantId)).length;
      return {
        plan,
        organizationCount: tenantsOnPlan.length,
        studentsUsed,
        adminsUsed,
        instructorsUsed,
        examsUsed,
      };
    });
  }, [plans, tenants, users, exams]);

  return (
    <PlatformLayout active="subs-usage">
      <p className="text-muted small mb-1">Platform Admin / Subscriptions / Usage</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Usage</h1>
      <p className="text-muted mb-3">Monitor platform usage across organizations.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load usage stats. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={5} className="g-3 mb-3">
            <StatCard
              label="Total Students"
              value={totalStudents}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Exams Conducted"
              value={completedSubmissions}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Active Exams"
              value={activeExams}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            />
            <StatCard
              label="Storage Used"
              value="—"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                </svg>
              }
            />
            <StatCard
              label="API Calls"
              value="—"
              iconBg="#fee2e2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Usage Overview</h2>
                  <p className="text-muted small mb-3">New exams and submissions per day, last 7 days.</p>
                  <LineTrendChart series={trendSeries} height={220} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Top Organizations by Usage</h2>
                  {topOrganizations.length === 0 ? (
                    <div className="text-center text-muted small py-5">No usage yet.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {topOrganizations.map(({ tenant, studentCount, examCount, submissionCount }) => (
                        <div key={tenant.id} className="d-flex align-items-center gap-2">
                          <OrgAvatar name={tenant.name} size={32} />
                          <div className="flex-grow-1">
                            <div className="fw-medium small">{tenant.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {studentCount} students · {examCount} exams · {submissionCount} submissions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Usage by Plan</h2>
              {usageByPlan.length === 0 ? (
                <div className="text-center text-muted small py-5">No plans yet.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-3">Plan</th>
                      <th>Organizations</th>
                      <th>Students</th>
                      <th>Admins</th>
                      <th>Instructors</th>
                      <th className="pe-3">Exams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageByPlan.map(({ plan, organizationCount, studentsUsed, adminsUsed, instructorsUsed, examsUsed }) => (
                      <tr key={plan.id}>
                        <td className="ps-3 fw-medium">{plan.name}</td>
                        <td className="text-muted">{organizationCount}</td>
                        <td className="text-muted">{limitCell(studentsUsed, plan.maxStudents)}</td>
                        <td className="text-muted">{limitCell(adminsUsed, plan.maxAdmins)}</td>
                        <td className="text-muted">{limitCell(instructorsUsed, plan.maxInstructors)}</td>
                        <td className="pe-3 text-muted">{limitCell(examsUsed, plan.maxExams)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </PlatformLayout>
  );
}
