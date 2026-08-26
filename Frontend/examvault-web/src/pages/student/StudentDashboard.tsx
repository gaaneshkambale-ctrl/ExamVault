import { useMemo } from 'react';
import { Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import PercentageRing from '../../components/PercentageRing';
import NotificationTypeIcon from '../../components/notifications/NotificationTypeIcon';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { useMyNotifications, useUnreadCount } from '../../hooks/useNotifications';
import { getMyResult } from '../../api/resultApi';
import { getMyAttempt } from '../../api/submissionApi';
import type { ResultSummaryResponse } from '../../types/result';
import type { CreationMethod } from '../../types/exam';

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function isUpcoming(exam: { status: string; startAtUtc: string | null; endAtUtc: string | null }) {
  if (exam.status !== 'Published') {
    return false;
  }
  if (!exam.endAtUtc) {
    return true;
  }
  return new Date(exam.endAtUtc).getTime() >= Date.now();
}

function UpcomingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 15.9 6.4 19.1l1.4-6.3-4.8-4.3 6.4-.6L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function TotalScoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 17 9 11 13 15 21 7" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 7 21 7 21 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExamsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ResultsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  variant: string;
  isLoading?: boolean;
}

function StatCard({ label, value, subtitle, icon, variant, isLoading }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex align-items-center gap-3">
          <div
            className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
            style={{ width: 44, height: 44 }}
          >
            {icon}
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">
              {isLoading ? <Spinner animation="border" size="sm" /> : value}
            </div>
            <div className={`small text-${variant}`}>{subtitle}</div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

interface QuickLinkProps {
  to: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  variant: string;
  badge?: number;
}

function QuickLink({ to, label, subtitle, icon, variant, badge }: QuickLinkProps) {
  return (
    <Col xs={6}>
      <Link
        to={to}
        className="d-flex align-items-center gap-2 p-3 rounded-3 text-decoration-none text-body h-100"
        style={{ border: '1px solid #eee' }}
      >
        <div
          className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0 position-relative`}
          style={{ width: 36, height: 36 }}
        >
          {icon}
          {!!badge && badge > 0 && (
            <Badge
              bg="danger"
              pill
              className="position-absolute top-0 start-100 translate-middle"
              style={{ fontSize: 10 }}
            >
              {badge}
            </Badge>
          )}
        </div>
        <div>
          <div className="fw-medium small">{label}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            {subtitle}
          </div>
        </div>
      </Link>
    </Col>
  );
}

const UPCOMING_LIST_COUNT = 3;
const RECENT_RESULTS_COUNT = 3;
const RECENT_NOTIFICATIONS_COUNT = 3;

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: exams, isLoading } = useExams();
  const { data: unread } = useUnreadCount();
  const { data: recentNotifications, isLoading: isLoadingNotifications } = useMyNotifications(
    false,
    1,
    RECENT_NOTIFICATIONS_COUNT,
  );

  const now = new Date();

  const upcomingExamsAll = (exams ?? []).filter(isUpcoming);
  const upcomingExams = upcomingExamsAll.slice(0, UPCOMING_LIST_COUNT);
  const questionCounts = useQuestionCountsByExam(upcomingExams.map((e) => e.id));

  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  // In-progress attempts have no result yet - merged in the same way My
  // Results does, so the Performance Overview donut's "In Progress" slice
  // isn't silently dropped.
  const attemptQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['submissions', 'mine', exam.id],
      queryFn: () => getMyAttempt(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingResults = publishedExams.length > 0 && resultQueries.some((q) => q.isLoading);
  const isLoadingAttempts = publishedExams.length > 0 && attemptQueries.some((q) => q.isLoading);

  const results: ResultSummaryResponse[] = resultQueries
    .map((q) => q.data)
    .filter((result): result is ResultSummaryResponse => !!result)
    .sort((a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime());

  const inProgressCount = attemptQueries.filter((q) => q.data?.attempt.status === 'InProgress').length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const performanceTotal = passedCount + failedCount + inProgressCount;

  const averagePercentage =
    results.length === 0
      ? 0
      : results.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0) /
        results.length;

  const totalScoreSum = results.reduce((sum, r) => sum + r.totalScore, 0);
  const totalMarksSum = results.reduce((sum, r) => sum + r.totalMarks, 0);

  const completedThisMonth = results.filter((r) => {
    const d = new Date(r.submittedAtUtc);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const nextUpcoming = [...upcomingExamsAll].sort(
    (a, b) => new Date(a.startAtUtc ?? 0).getTime() - new Date(b.startAtUtc ?? 0).getTime(),
  )[0];

  const recentResults = results.slice(0, RECENT_RESULTS_COUNT);

  return (
    <StudentLayout active="Dashboard">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName?.split(' ')[0] ?? 'Student'}! 👋</h1>
          <p className="text-muted mb-0">Here's an overview of your exam progress and performance.</p>
        </div>
        <Card className="border-0 shadow-sm">
          <Card.Body className="d-flex align-items-center gap-2 py-2 px-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
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

      <Row className="g-3 mb-4">
        <StatCard
          label="Upcoming Exams"
          value={String(upcomingExamsAll.length)}
          subtitle={nextUpcoming?.startAtUtc ? `Next: ${new Date(nextUpcoming.startAtUtc).toLocaleDateString()}` : 'No exams scheduled'}
          icon={<UpcomingIcon />}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Completed Exams"
          value={String(results.length)}
          subtitle={`This Month: ${completedThisMonth}`}
          icon={<CompletedIcon />}
          variant="success"
          isLoading={isLoadingResults}
        />
        <StatCard
          label="Average Score"
          value={results.length === 0 ? '—' : `${averagePercentage.toFixed(1)}%`}
          subtitle="Across all exams"
          icon={<ScoreIcon />}
          variant="info"
          isLoading={isLoadingResults}
        />
        <StatCard
          label="Total Score"
          value={results.length === 0 ? '—' : `${totalScoreSum} / ${totalMarksSum}`}
          subtitle="Across all exams"
          icon={<TotalScoreIcon />}
          variant="warning"
          isLoading={isLoadingResults}
        />
      </Row>

      <Row className="g-3 mb-4">
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body className={upcomingExams.length === 0 ? '' : 'p-0'}>
              <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                <h2 className="h6 fw-bold mb-0">Upcoming Exams</h2>
                <Link to="/exams" className="small">
                  View All
                </Link>
              </div>

              {isLoading && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              )}

              {!isLoading && upcomingExams.length === 0 && (
                <div className="text-center text-muted py-5">No upcoming exams right now.</div>
              )}

              {!isLoading && upcomingExams.length > 0 && (
                <div className="list-group list-group-flush">
                  {upcomingExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-4 py-3"
                    >
                      <div>
                        <div className="fw-medium">{exam.title}</div>
                        <div className="text-muted small mb-1">{creationMethodLabel[exam.creationMethod]} Exam</div>
                        <div className="d-flex gap-2">
                          <Badge bg="light" text="dark" className="border fw-normal">
                            {exam.durationMinutes} Min
                          </Badge>
                          <Badge bg="light" text="dark" className="border fw-normal">
                            {questionCounts[exam.id] ?? exam.totalQuestions} Questions
                          </Badge>
                        </div>
                      </div>
                      <div className="text-end">
                        {exam.startAtUtc && (
                          <div className="text-muted small mb-2">
                            <div>{new Date(exam.startAtUtc).toLocaleDateString()}</div>
                            <div>{new Date(exam.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        )}
                        <Link to={`/exams/${exam.id}`} className="btn btn-outline-primary btn-sm">
                          Start Exam
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className={recentResults.length === 0 ? '' : 'p-0'}>
              <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                <h2 className="h6 fw-bold mb-0">Recent Results</h2>
                <Link to="/results" className="small">
                  View All
                </Link>
              </div>

              {isLoadingResults && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              )}

              {!isLoadingResults && recentResults.length === 0 && (
                <div className="text-center text-muted py-5 px-4">
                  No results yet. They'll show up here once you complete an exam.
                </div>
              )}

              {!isLoadingResults && recentResults.length > 0 && (
                <>
                  <div className="table-responsive">
                    <table className="table mb-0 align-middle">
                      <thead className="text-muted small text-uppercase bg-light">
                        <tr>
                          <th className="ps-4">Exam Title</th>
                          <th>Score</th>
                          <th>Percentage</th>
                          <th>Result</th>
                          <th className="pe-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentResults.map((result) => {
                          const percentage = result.totalMarks > 0 ? (result.totalScore / result.totalMarks) * 100 : 0;
                          return (
                            <tr key={result.attemptId}>
                              <td className="ps-4 fw-medium">{result.examTitle}</td>
                              <td>
                                {result.totalScore} / {result.totalMarks}
                              </td>
                              <td className={percentage >= 40 ? 'text-success' : 'text-danger'}>
                                {percentage.toFixed(2)}%
                              </td>
                              <td>
                                <Badge bg={result.passed ? 'success' : 'danger'}>{result.passed ? 'Pass' : 'Fail'}</Badge>
                              </td>
                              <td className="pe-4 text-muted small">
                                {new Date(result.submittedAtUtc).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 px-4">
                    <Link to="/results" className="small text-decoration-none">
                      View All Results →
                    </Link>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 fw-bold mb-0">Performance Overview</h2>
                <Link to="/results" className="small">
                  View Details
                </Link>
              </div>

              {isLoadingResults || isLoadingAttempts ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : (
                <div className="d-flex align-items-center gap-4 flex-wrap">
                  <PercentageRing percentage={averagePercentage} size={140} strokeWidth={12}>
                    <div className="h5 fw-bold mb-0">{averagePercentage.toFixed(1)}%</div>
                    <div className="text-muted small">Average</div>
                  </PercentageRing>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between small mb-2">
                      <span>
                        <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: 8, height: 8 }} />
                        Passed
                      </span>
                      <span>
                        {passedCount} ({performanceTotal === 0 ? 0 : ((passedCount / performanceTotal) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span>
                        <span className="d-inline-block rounded-circle bg-danger me-2" style={{ width: 8, height: 8 }} />
                        Failed
                      </span>
                      <span>
                        {failedCount} ({performanceTotal === 0 ? 0 : ((failedCount / performanceTotal) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>
                        <span className="d-inline-block rounded-circle bg-warning me-2" style={{ width: 8, height: 8 }} />
                        In Progress
                      </span>
                      <span>
                        {inProgressCount} ({performanceTotal === 0 ? 0 : ((inProgressCount / performanceTotal) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Quick Links</h2>
              <Row className="g-2">
                <QuickLink to="/exams" label="My Exams" subtitle="View and attempt exams" icon={<ExamsIcon />} variant="primary" />
                <QuickLink to="/results" label="My Results" subtitle="Check your results" icon={<ResultsIcon />} variant="success" />
                <QuickLink
                  to="/notifications"
                  label="Notifications"
                  subtitle="View all notifications"
                  icon={<BellIcon />}
                  variant="warning"
                  badge={unread?.count}
                />
                <QuickLink to="/profile" label="Profile" subtitle="View your profile" icon={<ProfileIcon />} variant="secondary" />
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 fw-bold mb-0">Recent Notifications</h2>
                <Link to="/notifications" className="small">
                  View All
                </Link>
              </div>

              {isLoadingNotifications && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              )}

              {!isLoadingNotifications && (recentNotifications?.items.length ?? 0) === 0 && (
                <div className="text-center text-muted py-4">No notifications yet.</div>
              )}

              {!isLoadingNotifications && (recentNotifications?.items.length ?? 0) > 0 && (
                <div className="d-flex flex-column gap-3">
                  {recentNotifications!.items.map((notification) => (
                    <Link
                      key={notification.id}
                      to={`/notifications/${notification.id}`}
                      className="d-flex align-items-start gap-2 text-decoration-none text-body"
                    >
                      <NotificationTypeIcon type={notification.type} size={32} />
                      <div className="flex-grow-1">
                        <div className={notification.isRead ? 'small fw-medium' : 'small fw-bold'}>{notification.title}</div>
                        <div className="text-muted small">{notification.message}</div>
                      </div>
                      <div className="text-muted text-nowrap" style={{ fontSize: 12 }}>
                        {new Date(notification.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </StudentLayout>
  );
}
