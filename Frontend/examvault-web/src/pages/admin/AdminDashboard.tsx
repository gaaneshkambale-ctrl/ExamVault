import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import type { ExamResponse, ExamStatus } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const RECENT_EXAMS_COUNT = 5;
const PERIOD_OPTIONS = [3, 6, 12] as const;

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ExamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function QuestionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.9-2.3 3.3" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PublishedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function countCreatedInMonth(dates: string[], monthsAgo: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return dates.filter((d) => monthKey(new Date(d)) === monthKey(target)).length;
}

function buildMonthlyTrend(exams: ExamResponse[], months: number) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleString(undefined, { month: 'short' }) };
  });

  return buckets.map(({ key, label }) => ({
    label,
    value: exams.filter((exam) => monthKey(new Date(exam.createdOn)) === key).length,
  }));
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: string;
  isLoading: boolean;
  delta?: number;
}

function StatCard({ label, value, icon, variant, isLoading, delta }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <div className="d-flex align-items-start justify-content-between mb-2">
            <div
              className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
              style={{ width: 40, height: 40 }}
            >
              {icon}
            </div>
            {delta !== undefined && delta > 0 && (
              <Badge bg="success-subtle" text="success-emphasis">
                +{delta} this month
              </Badge>
            )}
          </div>
          <div className="text-muted small mb-1">{label}</div>
          <div className="h3 fw-bold mb-0">
            {isLoading ? <Spinner animation="border" size="sm" /> : value}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const { data: exams, isLoading: isLoadingExams } = useExams(isAdmin);
  const { data: users, isLoading: isLoadingUsers } = useUsers(isAdmin);
  const [trendMonths, setTrendMonths] = useState<(typeof PERIOD_OPTIONS)[number]>(6);

  const totalQuestions = exams?.reduce((sum, exam) => sum + exam.totalQuestions, 0) ?? 0;
  const publishedExams = exams?.filter((exam) => exam.status === 'Published').length ?? 0;

  const newUsersThisMonth = users ? countCreatedInMonth(users.map((u) => u.createdAtUtc), 0) : 0;
  const newExamsThisMonth = exams ? countCreatedInMonth(exams.map((e) => e.createdOn), 0) : 0;

  const recentExams = [...(exams ?? [])]
    .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())
    .slice(0, RECENT_EXAMS_COUNT);

  const trendData = useMemo(
    () => buildMonthlyTrend(exams ?? [], trendMonths),
    [exams, trendMonths],
  );

  return (
    <AdminLayout active="Dashboard">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName ?? 'Admin'}!</h1>
        <p className="text-muted mb-0">Here's what's happening across ExamVault.</p>
      </div>

      {!isAdmin && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            Your dashboard will show your exams and results here once that's available.
          </Card.Body>
        </Card>
      )}

      {isAdmin && (
        <>
          <Row className="g-3 mb-4">
            <StatCard
              label="Total Users"
              value={users?.length ?? 0}
              icon={<UsersIcon />}
              variant="primary"
              isLoading={isLoadingUsers}
              delta={newUsersThisMonth}
            />
            <StatCard
              label="Total Exams"
              value={exams?.length ?? 0}
              icon={<ExamsIcon />}
              variant="warning"
              isLoading={isLoadingExams}
              delta={newExamsThisMonth}
            />
            <StatCard
              label="Total Questions"
              value={totalQuestions}
              icon={<QuestionsIcon />}
              variant="info"
              isLoading={isLoadingExams}
            />
            <StatCard
              label="Published Exams"
              value={publishedExams}
              icon={<PublishedIcon />}
              variant="success"
              isLoading={isLoadingExams}
            />
          </Row>

          <Row className="g-3">
            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className={recentExams.length === 0 ? '' : 'p-0'}>
                  <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                    <h2 className="h6 fw-bold mb-0">Recent Exams</h2>
                    <Link to="/admin/exams" className="small">
                      View all
                    </Link>
                  </div>

                  {isLoadingExams && (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {!isLoadingExams && recentExams.length === 0 && (
                    <div className="text-center text-muted py-5">
                      No exams yet. Create one to see analytics here.
                    </div>
                  )}

                  {!isLoadingExams && recentExams.length > 0 && (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th className="ps-4">Title</th>
                          <th>Status</th>
                          <th>Questions</th>
                          <th className="pe-4">Created On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentExams.map((exam) => (
                          <tr key={exam.id}>
                            <td className="ps-4 fw-medium">
                              <Link to={`/admin/exams/${exam.id}`} className="text-decoration-none">
                                {exam.title}
                              </Link>
                            </td>
                            <td>
                              <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                            </td>
                            <td>{exam.totalQuestions}</td>
                            <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Exams Overview</h2>
                    <Form.Select
                      size="sm"
                      style={{ width: 'auto' }}
                      value={trendMonths}
                      onChange={(e) => setTrendMonths(Number(e.target.value) as (typeof PERIOD_OPTIONS)[number])}
                    >
                      {PERIOD_OPTIONS.map((months) => (
                        <option key={months} value={months}>
                          Last {months} months
                        </option>
                      ))}
                    </Form.Select>
                  </div>

                  {isLoadingExams ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <ExamsTrendChart data={trendData} />
                  )}
                  <p className="text-muted small mb-0 mt-2">Exams created per month.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
}
