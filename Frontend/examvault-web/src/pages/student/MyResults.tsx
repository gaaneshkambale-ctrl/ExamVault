import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import PercentageRing from '../../components/PercentageRing';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { useExams } from '../../hooks/useExams';
import { usePermissions } from '../../hooks/usePermissions';
import { getMyResult } from '../../api/resultApi';
import { getMyAttempt } from '../../api/submissionApi';
import type { CreationMethod } from '../../types/exam';

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

type RowStatus = 'Pass' | 'Fail' | 'InProgress';

const statusBadge: Record<RowStatus, { label: string; bg: string }> = {
  Pass: { label: 'Pass', bg: 'success' },
  Fail: { label: 'Fail', bg: 'danger' },
  InProgress: { label: 'In Progress', bg: 'warning' },
};

interface ResultRow {
  examId: string;
  examTitle: string;
  creationMethod: CreationMethod;
  rowStatus: RowStatus;
  totalScore: number | null;
  totalMarks: number;
  percentage: number | null;
  dateUtc: string;
}

function ExamRowIcon() {
  return (
    <div
      className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: 36, height: 36 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    </div>
  );
}

const PAGE_SIZE = 5;
const RECENT_COUNT = 5;

export default function MyResults() {
  const { hasPermission } = usePermissions();
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const [tab, setTab] = useState<'All' | 'Recent'>('All');
  const [page, setPage] = useState(1);

  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  const attemptQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['submissions', 'mine', exam.id],
      queryFn: () => getMyAttempt(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingResults = publishedExams.length > 0 && resultQueries.some((q) => q.isLoading);
  const isLoadingAttempts = publishedExams.length > 0 && attemptQueries.some((q) => q.isLoading);
  const loading = isLoadingExams || isLoadingResults || isLoadingAttempts;

  // A submitted result is the source of truth once it exists; an in-progress
  // attempt with no result yet still belongs on this page (matching the
  // page's own Result Key: "In Progress - result not yet published"), same
  // reasoning My Exams already applies to its own Completed/In Progress
  // split via the same getMyAttempt "mine"-lookup.
  const rows: ResultRow[] = publishedExams
    .map((exam, index) => {
      const result = resultQueries[index]?.data;
      if (result) {
        const percentage = result.totalMarks > 0 ? (result.totalScore / result.totalMarks) * 100 : 0;
        return {
          examId: exam.id,
          examTitle: exam.title,
          creationMethod: exam.creationMethod,
          rowStatus: result.passed ? 'Pass' : 'Fail',
          totalScore: result.totalScore,
          totalMarks: result.totalMarks,
          percentage,
          dateUtc: result.submittedAtUtc,
        } as ResultRow;
      }
      const attempt = attemptQueries[index]?.data;
      if (attempt && attempt.attempt.status === 'InProgress') {
        return {
          examId: exam.id,
          examTitle: exam.title,
          creationMethod: exam.creationMethod,
          rowStatus: 'InProgress',
          totalScore: null,
          totalMarks: exam.totalMarks,
          percentage: null,
          dateUtc: attempt.attempt.startedAtUtc,
        } as ResultRow;
      }
      return null;
    })
    .filter((row): row is ResultRow => row !== null)
    .sort((a, b) => new Date(b.dateUtc).getTime() - new Date(a.dateUtc).getTime());

  const graded = rows.filter((r) => r.rowStatus !== 'InProgress');
  const passedCount = rows.filter((r) => r.rowStatus === 'Pass').length;
  const failedCount = rows.filter((r) => r.rowStatus === 'Fail').length;
  const inProgressCount = rows.filter((r) => r.rowStatus === 'InProgress').length;

  const totalScoreSum = graded.reduce((sum, r) => sum + (r.totalScore ?? 0), 0);
  const totalMarksSum = graded.reduce((sum, r) => sum + r.totalMarks, 0);
  const averagePercentage =
    graded.length === 0 ? 0 : graded.reduce((sum, r) => sum + (r.percentage ?? 0), 0) / graded.length;
  const highest = graded.reduce<ResultRow | null>(
    (best, r) => (!best || (r.percentage ?? 0) > (best.percentage ?? 0) ? r : best),
    null,
  );

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows =
    tab === 'Recent' ? rows.slice(0, RECENT_COUNT) : rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  if (!hasPermission('Results - View')) {
    return (
      <StudentLayout active="My Results">
        <h1 className="h4 fw-bold mb-1 text-primary">My Results</h1>
        <Alert variant="warning" className="mb-0">
          You don't currently have access to view results. Contact your organization's admin if you believe
          this is a mistake.
        </Alert>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout active="My Results">
      <h1 className="h4 fw-bold mb-1 text-primary">My Results</h1>
      <p className="text-muted mb-4">View your exam performance and results.</p>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Exams Attempted</div>
              <div className="h4 fw-bold mb-0">{rows.length}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Score</div>
              <div className="h4 fw-bold mb-0 text-success">
                {totalScoreSum} <span className="fs-6 fw-normal text-muted">/ {totalMarksSum}</span>
              </div>
              <div className="small text-muted">{averagePercentage.toFixed(2)}%</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Average Percentage</div>
              <div className="h4 fw-bold mb-0">{averagePercentage.toFixed(2)}%</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Highest Score</div>
              <div className="h4 fw-bold mb-0 text-warning">
                {highest ? `${highest.percentage!.toFixed(2)}%` : '—'}
              </div>
              {highest && <div className="small text-muted">({highest.examTitle})</div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={8}>
          <div className="d-flex gap-4 border-bottom mb-3">
            {(['All', 'Recent'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn-link text-decoration-none px-0 pb-2"
                style={{
                  borderBottom: t === tab ? '2px solid #4f46e5' : '2px solid transparent',
                  color: t === tab ? '#4f46e5' : '#6c757d',
                  fontWeight: t === tab ? 600 : 400,
                }}
                onClick={() => setTab(t)}
              >
                {t === 'All' ? 'All Results' : 'Recent Results'}
              </button>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <Card.Body className={loading || visibleRows.length === 0 ? '' : 'p-0'}>
              {loading && (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              )}

              {!loading && rows.length === 0 && (
                <div className="text-center text-muted py-5">
                  No results yet. Submit an exam to see your score here.
                </div>
              )}

              {!loading && visibleRows.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Exam Title</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Result</th>
                      <th>Date</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const meta = statusBadge[row.rowStatus];
                      const date = new Date(row.dateUtc);
                      return (
                        <tr key={row.examId}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2">
                              <ExamRowIcon />
                              <div>
                                <div className="fw-medium">{row.examTitle}</div>
                                <div className="text-muted small">{creationMethodLabel[row.creationMethod]} Exam</div>
                              </div>
                            </div>
                          </td>
                          <td>{row.rowStatus === 'InProgress' ? '—' : `${row.totalScore} / ${row.totalMarks}`}</td>
                          <td>
                            <span
                              className={
                                row.rowStatus === 'Pass'
                                  ? 'text-success fw-medium'
                                  : row.rowStatus === 'Fail'
                                    ? 'text-danger fw-medium'
                                    : 'text-muted'
                              }
                            >
                              {row.percentage === null ? '—' : `${row.percentage.toFixed(2)}%`}
                            </span>
                          </td>
                          <td>
                            <Badge bg={meta.bg}>{meta.label}</Badge>
                          </td>
                          <td>
                            <div>{date.toLocaleDateString()}</div>
                            <div className="text-muted small">
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="pe-4">
                            {row.rowStatus === 'InProgress' ? (
                              <Link to={`/exams/${row.examId}/take`} className="btn btn-outline-warning btn-sm">
                                Resume
                              </Link>
                            ) : (
                              <Link
                                to={`/results/${row.examId}`}
                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                title="View"
                                aria-label={`View result for ${row.examTitle}`}
                              >
                                <ViewIcon />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {!loading && tab === 'All' && rows.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {rows.length} results
              </div>
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                    {p}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </Pagination>
            </div>
          )}
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Performance Overview</h2>
              <div className="d-flex justify-content-center mb-3">
                <PercentageRing percentage={averagePercentage}>
                  <div className="h4 fw-bold mb-0">{averagePercentage.toFixed(2)}%</div>
                  <div className="text-muted small">Average</div>
                </PercentageRing>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span>
                  <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: 8, height: 8 }} />
                  Passed
                </span>
                <span>
                  {passedCount} ({rows.length === 0 ? 0 : ((passedCount / rows.length) * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span>
                  <span className="d-inline-block rounded-circle bg-danger me-2" style={{ width: 8, height: 8 }} />
                  Failed
                </span>
                <span>
                  {failedCount} ({rows.length === 0 ? 0 : ((failedCount / rows.length) * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="d-flex justify-content-between small mb-3">
                <span>
                  <span className="d-inline-block rounded-circle bg-warning me-2" style={{ width: 8, height: 8 }} />
                  In Progress
                </span>
                <span>
                  {inProgressCount} ({rows.length === 0 ? 0 : ((inProgressCount / rows.length) * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="d-flex justify-content-between border-top pt-2">
                <span className="fw-medium">Total</span>
                <span className="fw-medium">{rows.length}</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Result Key</h2>
              <div className="d-flex align-items-start gap-2 mb-2">
                <Badge bg="success" style={{ minWidth: 44 }}>
                  Pass
                </Badge>
                <span className="small text-muted">Met or exceeded the exam's passing marks</span>
              </div>
              <div className="d-flex align-items-start gap-2 mb-2">
                <Badge bg="danger" style={{ minWidth: 44 }}>
                  Fail
                </Badge>
                <span className="small text-muted">Below the exam's passing marks</span>
              </div>
              <div className="d-flex align-items-start gap-2">
                <Badge bg="warning" style={{ minWidth: 44 }}>
                  In Progress
                </Badge>
                <span className="small text-muted">Result not yet published</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </StudentLayout>
  );
}
