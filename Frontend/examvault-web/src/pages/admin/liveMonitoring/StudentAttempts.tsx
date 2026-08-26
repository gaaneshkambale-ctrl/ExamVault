import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Pagination, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import UserAvatar from '../../../components/UserAvatar';
import { ViewIcon } from '../../../components/icons/ActionIcons';
import { useExams } from '../../../hooks/useExams';
import { useUsers } from '../../../hooks/useUsers';
import { useQuestionCountsByExam } from '../../../hooks/useQuestions';
import { useAttemptsWithAnswersByExam } from '../../../hooks/useSubmissions';
import { attemptViolationCount, getRiskLevel, type RiskLevel } from '../../../utils/proctoring';
import type { ExamResponse } from '../../../types/exam';
import type { AttemptStatus } from '../../../types/submission';

// "Live monitoring" - same polling mechanism Active Exams uses.
const POLL_INTERVAL_MS = 15000;
const PAGE_SIZE = 8;

const riskVariant: Record<RiskLevel, string> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
};

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

interface AttemptRow {
  attemptId: string;
  userId: string;
  examId: string;
  startedAtUtc: string;
  answeredCount: number;
  totalQuestions: number;
  violationCount: number;
  attemptStatus: AttemptStatus;
}

export default function StudentAttempts() {
  const { data: exams, isLoading: isLoadingExams, isError: isExamsError } = useExams();
  const { data: users } = useUsers();
  const [searchText, setSearchText] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [examFilter, setExamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());

  // Drives the Time Remaining column's live countdown - one shared ticking
  // clock for every row rather than a timer per row.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const publishedExamIds = useMemo(
    () => (exams ?? []).filter((exam) => exam.status === 'Published').map((exam) => exam.id),
    [exams],
  );
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsWithAnswersByExam(
    publishedExamIds,
    POLL_INTERVAL_MS,
  );
  const questionCounts = useQuestionCountsByExam(publishedExamIds);

  const examById = useMemo(() => {
    const map = new Map<string, ExamResponse>();
    for (const exam of exams ?? []) {
      map.set(exam.id, exam);
    }
    return map;
  }, [exams]);

  const userById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; hasPhoto: boolean }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email, hasPhoto: user.hasPhoto });
    }
    return map;
  }, [users]);

  // Includes every attempt (not just InProgress) so the Status filter has
  // something real to switch between - Active vs Completed.
  const rows: AttemptRow[] = publishedExamIds.flatMap((examId) => {
    const attempts = attemptsByExam[examId] ?? [];
    return attempts.map((a) => ({
      attemptId: a.attempt.id,
      userId: a.attempt.userId,
      examId,
      startedAtUtc: a.attempt.startedAtUtc,
      answeredCount: a.answers.length,
      totalQuestions: questionCounts[examId] ?? 0,
      violationCount: attemptViolationCount(a.attempt),
      attemptStatus: a.attempt.status,
    }));
  });

  const onlineRows = rows.filter((r) => r.attemptStatus === 'InProgress');

  const totals = {
    studentsOnline: onlineRows.length,
    totalAttempts: rows.length,
    atRiskCount: onlineRows.filter((r) => getRiskLevel(r.violationCount) === 'High').length,
    averageProgress:
      onlineRows.length === 0
        ? 0
        : Math.round(
            onlineRows.reduce(
              (sum, r) => sum + (r.totalQuestions > 0 ? (r.answeredCount / r.totalQuestions) * 100 : 0),
              0,
            ) / onlineRows.length,
          ),
  };

  const filteredRows = rows.filter((row) => {
    if (riskOnly && getRiskLevel(row.violationCount) !== 'High') {
      return false;
    }
    if (examFilter !== 'All' && row.examId !== examFilter) {
      return false;
    }
    if (statusFilter !== 'All') {
      const isActive = row.attemptStatus === 'InProgress';
      if ((statusFilter === 'Active') !== isActive) {
        return false;
      }
    }
    const term = searchText.trim().toLowerCase();
    if (!term) {
      return true;
    }
    const user = userById.get(row.userId);
    const haystack = `${user?.fullName ?? ''} ${user?.email ?? ''}`.toLowerCase();
    return haystack.includes(term);
  });

  useEffect(() => {
    setPage(1);
  }, [searchText, riskOnly, examFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  const loading = isLoadingExams || isLoadingAttempts;

  return (
    <AdminLayout active="Student Attempts">
      <h1 className="h4 fw-bold mb-1 text-primary">Student Attempts</h1>
      <p className="text-muted mb-4">Monitor students who are currently taking exams.</p>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Students Online</div>
              <div className="h4 fw-bold mb-0">{totals.studentsOnline}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Attempts</div>
              <div className="h4 fw-bold mb-0">{totals.totalAttempts}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small mb-1">At Risk Students</div>
                <div className="h4 fw-bold mb-0 text-danger">{totals.atRiskCount}</div>
              </div>
              {totals.atRiskCount > 0 && (
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setRiskOnly((v) => !v)}>
                  {riskOnly ? 'Show all' : 'View'}
                </button>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Average Progress</div>
              <div className="h4 fw-bold mb-0 text-info">
                {rows.length === 0 ? '—' : `${totals.averageProgress}%`}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={4}>
          <Form.Control
            type="search"
            placeholder="Search by student name or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {publishedExamIds.map((examId) => (
              <option key={examId} value={examId}>
                {examById.get(examId)?.title ?? examId}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Completed')}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </Form.Select>
        </Col>
        {riskOnly && (
          <Col xs="auto" className="d-flex align-items-center">
            <Badge bg="danger-subtle" text="danger-emphasis" className="d-flex align-items-center gap-2">
              At risk only
              <button
                type="button"
                className="btn-close btn-close-sm"
                style={{ fontSize: 10 }}
                aria-label="Clear at-risk filter"
                onClick={() => setRiskOnly(false)}
              />
            </Badge>
          </Col>
        )}
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || isExamsError || pagedRows.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isExamsError && !loading && (
            <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
          )}

          {!loading && !isExamsError && rows.length === 0 && (
            <div className="text-center text-muted py-5">No exam attempts yet.</div>
          )}

          {!loading && !isExamsError && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No attempts match your filters.</div>
          )}

          {!loading && !isExamsError && pagedRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Exam</th>
                  <th>Progress</th>
                  <th>Questions</th>
                  <th>Time Remaining</th>
                  <th>Status</th>
                  <th>Risk Level</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const user = userById.get(row.userId);
                  const exam = examById.get(row.examId);
                  const pct =
                    row.totalQuestions > 0 ? Math.round((row.answeredCount / row.totalQuestions) * 100) : 0;
                  const isActive = row.attemptStatus === 'InProgress';
                  const elapsedSeconds = (now - new Date(row.startedAtUtc).getTime()) / 1000;
                  const remainingSeconds = (exam?.durationMinutes ?? 0) * 60 - elapsedSeconds;
                  const risk = getRiskLevel(row.violationCount);

                  return (
                    <tr key={row.attemptId}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar
                            userId={row.userId}
                            fullName={user?.fullName ?? 'Student'}
                            hasPhoto={user?.hasPhoto ?? false}
                            size={32}
                          />
                          <div>
                            <div className="fw-medium">{user?.fullName ?? 'Unknown Student'}</div>
                            <div className="text-muted small">{user?.email ?? ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {exam?.title ?? 'Unknown Exam'}
                        <div className="text-muted small">{exam?.category}</div>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <ProgressBar now={pct} style={{ height: 6 }} />
                        <div className="small text-muted mt-1">{pct}%</div>
                      </td>
                      <td>
                        {row.answeredCount}/{row.totalQuestions}
                      </td>
                      <td>{isActive ? formatDuration(remainingSeconds) : '—'}</td>
                      <td>
                        <Badge bg={isActive ? 'success' : 'secondary'}>{isActive ? 'Active' : 'Completed'}</Badge>
                      </td>
                      <td>
                        <Badge bg={riskVariant[risk]}>{risk}</Badge>
                      </td>
                      <td className="pe-4">
                        <Link
                          to={`/admin/exams/${row.examId}`}
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="View Exam"
                          aria-label="View exam"
                        >
                          <ViewIcon />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!loading && !isExamsError && filteredRows.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredRows.length} entries
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
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
    </AdminLayout>
  );
}
