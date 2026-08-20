import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import PassRateDonutChart from '../../components/PassRateDonutChart';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { useUsers } from '../../hooks/useUsers';
import { useAssignments } from '../../hooks/useAssignments';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useNotificationHistory } from '../../hooks/useNotifications';
import { getAssignmentStatus } from '../../types/assignment';
import type { ExamStatus } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const RECENT_EXAMS_COUNT = 5;
const UPCOMING_EXAMS_COUNT = 5;
const RECENT_NOTIFICATIONS_COUNT = 5;
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

function AttemptsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 3 3 5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AverageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 15.9 6.4 19.1l1.4-6.3-4.8-4.3 6.4-.6L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function PassRateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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

function buildMonthlyTrend(dates: string[], months: number) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleString(undefined, { month: 'short' }) };
  });

  return buckets.map(({ key, label }) => ({
    label,
    value: dates.filter((d) => monthKey(new Date(d)) === key).length,
  }));
}

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface StatCardProps {
  label: string;
  value: string;
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
  const { data: assignments, isLoading: isLoadingAssignments } = useAssignments(isAdmin);
  const questionCounts = useQuestionCountsByExam(isAdmin ? exams?.map((e) => e.id) : undefined);
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(isAdmin ? exams : undefined);
  const { data: notificationHistory, isLoading: isLoadingNotifications } = useNotificationHistory(
    undefined,
    1,
    RECENT_NOTIFICATIONS_COUNT,
  );
  const [trendMonths, setTrendMonths] = useState<(typeof PERIOD_OPTIONS)[number]>(6);

  // exam.totalQuestions is a legacy field that's never kept in sync with
  // Question Service, so it's always 0 - use the real live counts instead.
  const totalQuestions = exams?.reduce((sum, exam) => sum + (questionCounts[exam.id] ?? 0), 0) ?? 0;
  const publishedExams = exams?.filter((exam) => exam.status === 'Published').length ?? 0;
  const draftExams = exams?.filter((exam) => exam.status === 'Draft').length ?? 0;

  const newUsersThisMonth = users ? countCreatedInMonth(users.map((u) => u.createdAtUtc), 0) : 0;
  const newExamsThisMonth = exams ? countCreatedInMonth(exams.map((e) => e.createdOn), 0) : 0;

  const passedCount = allResults.filter((r) => r.passed).length;
  const failedCount = allResults.length - passedCount;
  const averageScore =
    allResults.length === 0
      ? 0
      : Math.round(
          allResults.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0) /
            allResults.length,
        );
  const passRate = allResults.length === 0 ? 0 : Math.round((passedCount / allResults.length) * 100);

  const recentExams = [...(exams ?? [])]
    .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())
    .slice(0, RECENT_EXAMS_COUNT);

  const upcomingAssignments = [...(assignments ?? [])]
    .map((a) => ({ ...a, status: getAssignmentStatus(a.startAtUtc, a.endAtUtc) }))
    .filter((a) => a.status === 'Upcoming' || a.status === 'Active')
    .sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime())
    .slice(0, UPCOMING_EXAMS_COUNT);

  const scheduledExamsCount = (assignments ?? []).filter(
    (a) => getAssignmentStatus(a.startAtUtc, a.endAtUtc) === 'Upcoming',
  ).length;

  const completedAttemptsTrend = useMemo(
    () => buildMonthlyTrend(allResults.map((r) => r.submittedAtUtc), trendMonths),
    [allResults, trendMonths],
  );

  const studentsCount = users?.filter((u) => u.role === 'Student').length ?? 0;
  const adminsCount = users?.filter((u) => u.role === 'Admin').length ?? 0;
  const userRegistrationTrend = useMemo(
    () => buildMonthlyTrend((users ?? []).map((u) => u.createdAtUtc), trendMonths),
    [users, trendMonths],
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
              value={String(users?.length ?? 0)}
              icon={<UsersIcon />}
              variant="primary"
              isLoading={isLoadingUsers}
              delta={newUsersThisMonth}
            />
            <StatCard
              label="Total Exams"
              value={String(exams?.length ?? 0)}
              icon={<ExamsIcon />}
              variant="warning"
              isLoading={isLoadingExams}
              delta={newExamsThisMonth}
            />
            <StatCard
              label="Total Questions"
              value={String(totalQuestions)}
              icon={<QuestionsIcon />}
              variant="info"
              isLoading={isLoadingExams}
            />
            <StatCard
              label="Published Exams"
              value={String(publishedExams)}
              icon={<PublishedIcon />}
              variant="success"
              isLoading={isLoadingExams}
            />
            <StatCard
              label="Total Attempts"
              value={String(allResults.length)}
              icon={<AttemptsIcon />}
              variant="primary"
              isLoading={isLoadingResults}
            />
            <StatCard
              label="Average Score"
              value={allResults.length === 0 ? '—' : `${averageScore}%`}
              icon={<AverageIcon />}
              variant="warning"
              isLoading={isLoadingResults}
            />
            <StatCard
              label="Pass Rate"
              value={allResults.length === 0 ? '—' : `${passRate}%`}
              icon={<PassRateIcon />}
              variant="success"
              isLoading={isLoadingResults}
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Completed Attempts</h2>
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

                  {isLoadingResults ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <ExamsTrendChart data={completedAttemptsTrend} />
                  )}
                  <p className="text-muted small mb-0 mt-2">Exam attempts submitted per month.</p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Results Overview</h2>
                  {isLoadingResults ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <>
                      <PassRateDonutChart passed={passedCount} failed={failedCount} />
                      <div className="mt-3">
                        <div className="d-flex justify-content-between border-bottom py-2">
                          <span className="text-muted small">Average Score</span>
                          <span className="fw-medium">{allResults.length === 0 ? '—' : `${averageScore}%`}</span>
                        </div>
                        <div className="d-flex justify-content-between border-bottom py-2">
                          <span className="text-muted small">Passed</span>
                          <span className="fw-medium text-success">{passedCount}</span>
                        </div>
                        <div className="d-flex justify-content-between py-2">
                          <span className="text-muted small">Failed</span>
                          <span className="fw-medium text-danger">{failedCount}</span>
                        </div>
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={6}>
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
                            <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                            <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className={upcomingAssignments.length === 0 ? '' : 'p-0'}>
                  <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                    <h2 className="h6 fw-bold mb-0">Upcoming Exams</h2>
                    <Link to="/admin/exams" className="small">
                      View all
                    </Link>
                  </div>

                  {isLoadingAssignments && (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {!isLoadingAssignments && upcomingAssignments.length === 0 && (
                    <div className="text-center text-muted py-5">No upcoming or active assignments.</div>
                  )}

                  {!isLoadingAssignments && upcomingAssignments.length > 0 && (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th className="ps-4">Exam Title</th>
                          <th>Start Date</th>
                          <th>Candidates</th>
                          <th className="pe-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingAssignments.map((a) => (
                          <tr key={a.id}>
                            <td className="ps-4 fw-medium">{a.examTitle}</td>
                            <td>{new Date(a.startAtUtc).toLocaleString()}</td>
                            <td>{a.targetCount}</td>
                            <td className="pe-4">
                              <Badge bg={a.status === 'Active' ? 'success' : 'primary'}>{a.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-0">
                  <div className="p-4 pb-3">
                    <h2 className="h6 fw-bold mb-0">Pending Actions</h2>
                  </div>
                  <Table hover className="mb-0 align-middle">
                    <tbody>
                      <tr>
                        <td className="ps-4">Draft Exams</td>
                        <td>
                          <Badge bg="secondary">{isLoadingExams ? '—' : draftExams}</Badge>
                        </td>
                        <td className="pe-4 text-end">
                          <Link
                            to="/admin/exams?status=Draft"
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Review"
                            aria-label="Review draft exams"
                          >
                            <ViewIcon />
                          </Link>
                        </td>
                      </tr>
                      <tr>
                        <td className="ps-4">Scheduled Exams</td>
                        <td>
                          <Badge bg="primary">{isLoadingAssignments ? '—' : scheduledExamsCount}</Badge>
                        </td>
                        <td className="pe-4 text-end">
                          <Link
                            to="/admin/exams"
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View"
                            aria-label="View scheduled exams"
                          >
                            <ViewIcon />
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className={(notificationHistory?.items.length ?? 0) === 0 ? '' : 'p-0'}>
                  <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                    <h2 className="h6 fw-bold mb-0">Recent Notifications</h2>
                    <Link to="/admin/notifications/history" className="small">
                      View all
                    </Link>
                  </div>

                  {isLoadingNotifications && (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {!isLoadingNotifications && (notificationHistory?.items.length ?? 0) === 0 && (
                    <div className="text-center text-muted py-5">No notifications sent yet.</div>
                  )}

                  {!isLoadingNotifications && (notificationHistory?.items.length ?? 0) > 0 && (
                    <div className="px-4 pb-2">
                      {notificationHistory!.items.map((batch) => (
                        <Link
                          key={batch.batchId}
                          to={`/admin/notifications/history/${batch.batchId}`}
                          className="d-flex align-items-start justify-content-between gap-2 py-2 border-bottom text-decoration-none text-body"
                        >
                          <div>
                            <div className="small fw-medium">{batch.title}</div>
                            <NotificationTypeBadge type={batch.type} />
                          </div>
                          <span className="text-muted small text-nowrap">{timeAgo(batch.sentAtUtc)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">User Overview</h2>
                  <Row className="g-4 align-items-center">
                    <Col xs={12} md={4}>
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span className="text-muted small">Students</span>
                        <span className="fw-medium">{isLoadingUsers ? '—' : studentsCount}</span>
                      </div>
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span className="text-muted small">Admins</span>
                        <span className="fw-medium">{isLoadingUsers ? '—' : adminsCount}</span>
                      </div>
                      <div className="d-flex justify-content-between py-2">
                        <span className="text-muted small">New Users This Month</span>
                        <span className="fw-medium">{isLoadingUsers ? '—' : newUsersThisMonth}</span>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <p className="text-muted small mb-2">User Registration Trend</p>
                      {isLoadingUsers ? (
                        <div className="d-flex justify-content-center py-5">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : (
                        <ExamsTrendChart data={userRegistrationTrend} />
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Quick Actions</h2>
                  <div className="d-flex flex-wrap gap-2">
                    <Link to="/admin/exams/create" className="btn btn-outline-primary">
                      + Create Exam
                    </Link>
                    <Link to="/admin/assignments/new" className="btn btn-outline-primary">
                      Assign Exam
                    </Link>
                    <Link to="/admin/notifications/create" className="btn btn-outline-primary">
                      Create Notification
                    </Link>
                    <Link to="/admin/reports" className="btn btn-outline-primary">
                      View Reports
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
}
