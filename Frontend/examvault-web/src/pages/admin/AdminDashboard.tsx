import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import DualTrendChart from '../../components/DualTrendChart';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import DeleteExamButton from '../../components/DeleteExamButton';
import { ViewIcon, EditIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { useUsers } from '../../hooks/useUsers';
import { useAssignments } from '../../hooks/useAssignments';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { useNotificationHistory } from '../../hooks/useNotifications';
import { getAssignmentStatus } from '../../types/assignment';
import type { CreationMethod, ExamStatus } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

const UPCOMING_EXAMS_COUNT = 5;
const RECENT_NOTIFICATIONS_COUNT = 5;
const ACTIVITY_DAYS = 7;
const RECENT_EXAMS_PAGE_SIZE = 5;

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

function ActiveExamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countCreatedInMonth(dates: string[], monthsAgo: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return dates.filter((d) => monthKey(new Date(d)) === monthKey(target)).length;
}

// Percentage change vs the prior month, matching the wireframe's "vs last
// month" stat cards. Returns null when there's no meaningful comparison
// (both periods empty), so the caller can hide the badge instead of
// showing a misleading "+100%" or divide-by-zero artifact.
function percentChangeVsLastMonth(dates: string[]): number | null {
  const thisMonth = countCreatedInMonth(dates, 0);
  const lastMonth = countCreatedInMonth(dates, 1);
  if (lastMonth === 0) {
    return thisMonth === 0 ? null : 100;
  }
  return ((thisMonth - lastMonth) / lastMonth) * 100;
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

function buildDailyActivity(results: { examId: string; userId: string; submittedAtUtc: string }[], days: number) {
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) };
  });

  return buckets.map(({ key, label }) => {
    const dayResults = results.filter((r) => dayKey(new Date(r.submittedAtUtc)) === key);
    return {
      label,
      valueA: new Set(dayResults.map((r) => r.examId)).size,
      valueB: new Set(dayResults.map((r) => r.userId)).size,
    };
  });
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
  icon: ReactNode;
  variant: string;
  isLoading: boolean;
  deltaPercent?: number | null;
  caption?: string;
}

function StatCard({ label, value, icon, variant, isLoading, deltaPercent, caption }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 mb-2">
            <div
              className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
              style={{ width: 40, height: 40 }}
            >
              {icon}
            </div>
            <div className="text-muted small">{label}</div>
          </div>
          <div className="d-flex align-items-baseline gap-2">
            <div className="h3 fw-bold mb-0">{isLoading ? <Spinner animation="border" size="sm" /> : value}</div>
            {deltaPercent != null && (
              <span className={`small fw-medium ${deltaPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(deltaPercent).toFixed(1)}%
              </span>
            )}
          </div>
          {caption && <div className="text-muted small">{caption}</div>}
        </Card.Body>
      </Card>
    </Col>
  );
}

function QuickActionRow({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="d-flex justify-content-between align-items-center w-100 py-2 px-3 rounded-2 text-decoration-none text-body border mb-2"
    >
      <span className="small fw-medium">{label}</span>
      <ChevronRightIcon />
    </Link>
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
  const {
    data: notificationHistory,
    isLoading: isLoadingNotifications,
    isError: isNotificationsError,
  } = useNotificationHistory(undefined, 1, RECENT_NOTIFICATIONS_COUNT);

  const publishedExamIds = useMemo(
    () => (exams ?? []).filter((exam) => exam.status === 'Published').map((exam) => exam.id),
    [exams],
  );
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(isAdmin ? publishedExamIds : undefined);
  const activeExamsCount = publishedExamIds.filter((id) =>
    (attemptsByExam[id] ?? []).some((a) => a.status === 'InProgress'),
  ).length;

  const [recentExamsPage, setRecentExamsPage] = useState(1);

  const now = new Date();

  // exam.totalQuestions is a legacy field that's never kept in sync with
  // Question Service, so it's always 0 - use the real live counts instead.
  const totalQuestions = exams?.reduce((sum, exam) => sum + (questionCounts[exam.id] ?? 0), 0) ?? 0;
  const publishedExams = exams?.filter((exam) => exam.status === 'Published').length ?? 0;
  const draftExams = exams?.filter((exam) => exam.status === 'Draft').length ?? 0;

  const passedCount = allResults.filter((r) => r.passed).length;
  const averageScore =
    allResults.length === 0
      ? 0
      : Math.round(
          allResults.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0) /
            allResults.length,
        );
  const passRate = allResults.length === 0 ? 0 : Math.round((passedCount / allResults.length) * 100);

  const usersDelta = useMemo(() => percentChangeVsLastMonth((users ?? []).map((u) => u.createdAtUtc)), [users]);
  const examsDelta = useMemo(() => percentChangeVsLastMonth((exams ?? []).map((e) => e.createdOn)), [exams]);
  const attemptsDelta = useMemo(
    () => percentChangeVsLastMonth(allResults.map((r) => r.submittedAtUtc)),
    [allResults],
  );

  const manualCount = exams?.filter((e) => e.creationMethod === 'Manual').length ?? 0;
  const aiCount = exams?.filter((e) => e.creationMethod === 'AiGenerated').length ?? 0;

  // Sorted newest-first, with real pagination (not just a fixed top-5 slice)
  // now that the wireframe wants "Showing X to Y of Z" controls on the
  // dashboard itself, not only on Manage Exams.
  const allExamsSorted = useMemo(
    () => [...(exams ?? [])].sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()),
    [exams],
  );
  const recentExamsTotalPages = Math.max(1, Math.ceil(allExamsSorted.length / RECENT_EXAMS_PAGE_SIZE));
  const recentExamsCurrentPage = Math.min(recentExamsPage, recentExamsTotalPages);
  const pagedRecentExams = allExamsSorted.slice(
    (recentExamsCurrentPage - 1) * RECENT_EXAMS_PAGE_SIZE,
    recentExamsCurrentPage * RECENT_EXAMS_PAGE_SIZE,
  );

  // Same "sum assignment targetCount per exam" pattern Active Exams already
  // uses to answer "how many students are expected to take this exam".
  const participantsByExam = useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of assignments ?? []) {
      map.set(assignment.examId, (map.get(assignment.examId) ?? 0) + assignment.targetCount);
    }
    return map;
  }, [assignments]);

  const upcomingAssignments = [...(assignments ?? [])]
    .map((a) => ({ ...a, status: getAssignmentStatus(a.startAtUtc, a.endAtUtc) }))
    .filter((a) => a.status === 'Upcoming' || a.status === 'Active')
    .sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime())
    .slice(0, UPCOMING_EXAMS_COUNT);

  const scheduledExamsCount = (assignments ?? []).filter(
    (a) => getAssignmentStatus(a.startAtUtc, a.endAtUtc) === 'Upcoming',
  ).length;

  const dailyActivity = useMemo(() => buildDailyActivity(allResults, ACTIVITY_DAYS), [allResults]);

  const studentsCount = users?.filter((u) => u.role === 'Student').length ?? 0;
  const adminsCount = users?.filter((u) => u.role === 'Admin').length ?? 0;
  const userRegistrationTrend = useMemo(
    () => buildMonthlyTrend((users ?? []).map((u) => u.createdAtUtc), 6),
    [users],
  );

  return (
    <AdminLayout active="Dashboard">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName ?? 'Admin'}! 👋</h1>
          <p className="text-muted mb-0">Here's what's happening across ExamVault today.</p>
        </div>
        <Card className="border-0 shadow-sm">
          <Card.Body className="d-flex align-items-center gap-2 py-2 px-3">
            <DateIcon />
            <div>
              <div className="small fw-medium">
                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </Card.Body>
        </Card>
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
              deltaPercent={usersDelta}
              caption="vs last month"
            />
            <StatCard
              label="Total Exams"
              value={String(exams?.length ?? 0)}
              icon={<ExamsIcon />}
              variant="warning"
              isLoading={isLoadingExams}
              deltaPercent={examsDelta}
              caption="vs last month"
            />
            <StatCard
              label="Total Attempts"
              value={String(allResults.length)}
              icon={<AttemptsIcon />}
              variant="info"
              isLoading={isLoadingResults}
              deltaPercent={attemptsDelta}
              caption="vs last month"
            />
            <StatCard
              label="Average Score"
              value={allResults.length === 0 ? '—' : `${averageScore}%`}
              icon={<AverageIcon />}
              variant="success"
              isLoading={isLoadingResults}
              caption="Across all exams"
            />
            <StatCard
              label="Active Exams"
              value={String(activeExamsCount)}
              icon={<ActiveExamsIcon />}
              variant="danger"
              isLoading={isLoadingExams || isLoadingAttempts}
              caption="Ongoing"
            />
            <StatCard
              label="Published Exams"
              value={String(publishedExams)}
              icon={<PublishedIcon />}
              variant="success"
              isLoading={isLoadingExams}
            />
            <StatCard
              label="Total Questions"
              value={String(totalQuestions)}
              icon={<QuestionsIcon />}
              variant="info"
              isLoading={isLoadingExams}
            />
            <StatCard
              label="Pass Rate"
              value={allResults.length === 0 ? '—' : `${passRate}%`}
              icon={<PassRateIcon />}
              variant="warning"
              isLoading={isLoadingResults}
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Exam Activity (Last 7 Days)</h2>
                    <Badge bg="light" text="dark" className="border fw-normal">
                      Last 7 Days
                    </Badge>
                  </div>

                  {isLoadingResults ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <DualTrendChart data={dailyActivity} seriesALabel="Exams Conducted" seriesBLabel="Users Participated" />
                  )}
                  <p className="text-muted small mb-0 mt-2">
                    Based on submitted attempts - exams still in progress aren't counted until submitted.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Creation Method Distribution</h2>
                  {isLoadingExams ? (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <>
                      <SegmentDonutChart
                        centerLabel="Total Exams"
                        segments={[
                          { label: 'Manual Exams', value: manualCount, color: '#4f46e5' },
                          { label: 'AI Exams', value: aiCount, color: '#16a34a' },
                        ]}
                      />
                      <div className="mt-3">
                        {[
                          { label: 'Manual Exams', count: manualCount, color: '#4f46e5' },
                          { label: 'AI Exams', count: aiCount, color: '#16a34a' },
                        ].map((seg) => {
                          const total = manualCount + aiCount;
                          const pct = total === 0 ? 0 : Math.round((seg.count / total) * 100);
                          return (
                            <div key={seg.label} className="d-flex justify-content-between align-items-center py-1 small">
                              <span className="d-flex align-items-center gap-2">
                                <span
                                  className="rounded-circle d-inline-block"
                                  style={{ width: 8, height: 8, background: seg.color }}
                                />
                                {seg.label}
                              </span>
                              <span>
                                {pct}% ({seg.count})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Quick Actions</h2>
                  <QuickActionRow to="/admin/exams/create" label="Create New Exam" />
                  <QuickActionRow to="/admin/exams" label="Manage Exams" />
                  <QuickActionRow to="/admin/users" label="Manage Users" />
                  <QuickActionRow to="/admin/results/exams" label="View All Results" />
                  <QuickActionRow to="/admin/reports" label="System Reports" />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className={pagedRecentExams.length === 0 ? '' : 'p-0'}>
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

                  {!isLoadingExams && pagedRecentExams.length === 0 && (
                    <div className="text-center text-muted py-5">
                      No exams yet. Create one to see analytics here.
                    </div>
                  )}

                  {!isLoadingExams && pagedRecentExams.length > 0 && (
                    <>
                      <Table responsive hover className="mb-0 align-middle">
                        <thead className="text-muted small text-uppercase">
                          <tr>
                            <th className="ps-4">Title</th>
                            <th>Type</th>
                            <th>Questions</th>
                            <th>Participants</th>
                            <th>Status</th>
                            <th className="pe-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRecentExams.map((exam) => (
                            <tr key={exam.id}>
                              <td className="ps-4 fw-medium">
                                <Link to={`/admin/exams/${exam.id}`} className="text-decoration-none">
                                  {exam.title}
                                </Link>
                              </td>
                              <td>{creationMethodLabel[exam.creationMethod]}</td>
                              <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                              <td>{participantsByExam.get(exam.id) ?? 0}</td>
                              <td>
                                <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                              </td>
                              <td className="pe-4">
                                <div className="d-flex gap-2">
                                  <Link
                                    to={`/admin/exams/${exam.id}`}
                                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                                    style={{ width: 32, height: 32 }}
                                    title="View"
                                    aria-label={`View ${exam.title}`}
                                  >
                                    <ViewIcon />
                                  </Link>
                                  <Link
                                    to={`/admin/exams/${exam.id}/edit`}
                                    className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                                    style={{ width: 32, height: 32 }}
                                    title="Edit"
                                    aria-label={`Edit ${exam.title}`}
                                  >
                                    <EditIcon />
                                  </Link>
                                  <DeleteExamButton examId={exam.id} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <div className="d-flex justify-content-between align-items-center p-3 px-4">
                        <div className="text-muted small">
                          Showing {(recentExamsCurrentPage - 1) * RECENT_EXAMS_PAGE_SIZE + 1} to{' '}
                          {Math.min(recentExamsCurrentPage * RECENT_EXAMS_PAGE_SIZE, allExamsSorted.length)} of{' '}
                          {allExamsSorted.length} exams
                        </div>
                        <Pagination className="mb-0" size="sm">
                          <Pagination.Prev
                            disabled={recentExamsCurrentPage === 1}
                            onClick={() => setRecentExamsPage((p) => Math.max(1, p - 1))}
                          />
                          {Array.from({ length: recentExamsTotalPages }, (_, i) => i + 1).map((p) => (
                            <Pagination.Item key={p} active={p === recentExamsCurrentPage} onClick={() => setRecentExamsPage(p)}>
                              {p}
                            </Pagination.Item>
                          ))}
                          <Pagination.Next
                            disabled={recentExamsCurrentPage === recentExamsTotalPages}
                            onClick={() => setRecentExamsPage((p) => Math.min(recentExamsTotalPages, p + 1))}
                          />
                        </Pagination>
                      </div>
                    </>
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
                    {!isNotificationsError && (
                      <Link to="/admin/notifications/history" className="small">
                        View all
                      </Link>
                    )}
                  </div>

                  {isLoadingNotifications && (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {isNotificationsError && (
                    <div className="text-center text-muted py-5">
                      Notifications aren&apos;t included in your current plan.
                    </div>
                  )}

                  {!isLoadingNotifications && !isNotificationsError && (notificationHistory?.items.length ?? 0) === 0 && (
                    <div className="text-center text-muted py-5">No notifications sent yet.</div>
                  )}

                  {!isLoadingNotifications && !isNotificationsError && (notificationHistory?.items.length ?? 0) > 0 && (
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
            <Col xs={12} lg={8}>
              <Card className="border-0 shadow-sm h-100">
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
                        <span className="fw-medium">{isLoadingUsers ? '—' : countCreatedInMonth((users ?? []).map((u) => u.createdAtUtc), 0)}</span>
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

            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-1">System Overview</h2>
                  <p className="text-muted small mb-0">
                    Server storage, database health, uptime, and active-session metrics aren't wired up to any
                    backend yet - this section is a placeholder rather than fabricated numbers.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
}
