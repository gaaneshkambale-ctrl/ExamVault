import { useMemo } from 'react';
import { Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import { getMyResult } from '../../api/resultApi';
import type { ResultSummaryResponse } from '../../types/result';

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

function CertificatesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 13 7 22l5-3 5 3-1.5-9" strokeLinejoin="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: string;
  isLoading?: boolean;
}

function StatCard({ label, value, icon, variant, isLoading }: StatCardProps) {
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
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

const UPCOMING_LIST_COUNT = 3;

const RECENT_RESULTS_COUNT = 3;
const TREND_RESULTS_COUNT = 6;

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: exams, isLoading } = useExams();

  const upcomingExams = (exams ?? []).filter(isUpcoming).slice(0, UPCOMING_LIST_COUNT);

  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingResults = publishedExams.length > 0 && resultQueries.some((q) => q.isLoading);

  const results: ResultSummaryResponse[] = resultQueries
    .map((q) => q.data)
    .filter((result): result is ResultSummaryResponse => !!result)
    .sort((a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime());

  const averageScoreLabel =
    results.length === 0
      ? '—'
      : `${Math.round(
          results.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0) /
            results.length,
        )}%`;

  const recentResults = results.slice(0, RECENT_RESULTS_COUNT);

  const trendData = [...results]
    .sort((a, b) => new Date(a.submittedAtUtc).getTime() - new Date(b.submittedAtUtc).getTime())
    .slice(-TREND_RESULTS_COUNT)
    .map((r) => ({
      label: r.examTitle.length > 10 ? `${r.examTitle.slice(0, 10)}…` : r.examTitle,
      value: r.totalMarks > 0 ? Math.round((r.totalScore / r.totalMarks) * 100) : 0,
    }));

  return (
    <StudentLayout active="Dashboard">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName ?? 'Student'}!</h1>
        <p className="text-muted mb-0">Here's what's happening with your exams.</p>
      </div>

      <Row className="g-3 mb-4">
        <StatCard
          label="Upcoming Exams"
          value={String(upcomingExams.length)}
          icon={<UpcomingIcon />}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Completed Exams"
          value={String(results.length)}
          icon={<CompletedIcon />}
          variant="success"
          isLoading={isLoadingResults}
        />
        <StatCard
          label="Average Score"
          value={averageScoreLabel}
          icon={<ScoreIcon />}
          variant="info"
          isLoading={isLoadingResults}
        />
        <StatCard label="Certificates" value="0" icon={<CertificatesIcon />} variant="warning" />
      </Row>

      <Row className="g-3 mb-4">
        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm h-100">
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
                        <div className="text-muted small">{exam.durationMinutes} min</div>
                      </div>
                      <Link to={`/exams/${exam.id}`} className="btn btn-primary btn-sm">
                        Start Exam
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
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
                <div className="text-center text-muted py-5">
                  No results yet. They'll show up here once you complete an exam.
                </div>
              )}

              {!isLoadingResults && recentResults.length > 0 && (
                <div className="d-flex flex-column gap-2">
                  {recentResults.map((result) => (
                    <Link
                      key={result.attemptId}
                      to={`/results/${result.examId}`}
                      className="d-flex justify-content-between align-items-center text-decoration-none text-body p-2 rounded-2"
                      style={{ border: '1px solid #eee' }}
                    >
                      <div>
                        <div className="fw-medium">{result.examTitle}</div>
                        <div className="text-muted small">
                          {new Date(result.submittedAtUtc).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge bg={result.passed ? 'success' : 'danger'}>
                        {result.totalScore} / {result.totalMarks}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <h2 className="h6 fw-bold mb-3">Performance Overview</h2>
          {isLoadingResults ? (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" size="sm" />
            </div>
          ) : (
            <ExamsTrendChart data={trendData} />
          )}
          <p className="text-muted small mb-0 mt-2">
            {trendData.length === 0
              ? 'Your scores will appear here once results are available.'
              : 'Percentage scored on your most recent completed exams.'}
          </p>
        </Card.Body>
      </Card>
    </StudentLayout>
  );
}
