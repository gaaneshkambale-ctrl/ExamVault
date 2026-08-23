import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import { useExams } from '../../hooks/useExams';
import { getMyAttempt } from '../../api/submissionApi';
import { getMyAssignmentForExam } from '../../api/assignmentApi';
import { getAssignmentStatus } from '../../types/assignment';
import type { CreationMethod, ExamResponse } from '../../types/exam';

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

type Tab = 'All' | 'Upcoming' | 'In Progress' | 'Completed' | 'Expired';
const TABS: Tab[] = ['All', 'Upcoming', 'In Progress', 'Completed', 'Expired'];

type RowStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'Expired';

const statusVariant: Record<RowStatus, string> = {
  Upcoming: 'primary',
  'In Progress': 'warning',
  Completed: 'success',
  Expired: 'danger',
};

interface ExamRow extends ExamResponse {
  rowStatus: RowStatus;
  hasRetakesLeft: boolean;
  startAtUtc: string | null;
  endAtUtc: string | null;
  attemptStartedAtUtc: string | null;
}

function isTab(value: string | null): value is Tab {
  return !!value && (TABS as string[]).includes(value);
}

const ROW_ICON_PALETTE = [
  { bg: '#e0e7ff', fg: '#4338ca' },
  { bg: '#fef3c7', fg: '#b45309' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fee2e2', fg: '#b91c1c' },
  { bg: '#f3e8ff', fg: '#7e22ce' },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function ExamRowIcon({ examId }: { examId: string }) {
  const palette = ROW_ICON_PALETTE[hashString(examId) % ROW_ICON_PALETTE.length];
  return (
    <div
      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: 40, height: 40, backgroundColor: palette.bg, color: palette.fg }}
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

function formatDateTime(value: string | null): { date: string; time: string } {
  if (!value) return { date: '—', time: '' };
  const d = new Date(value);
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}

function timeLeftLabel(startedAtUtc: string | null, durationMinutes: number): string {
  if (!startedAtUtc) return '—';
  const deadline = new Date(startedAtUtc).getTime() + durationMinutes * 60 * 1000;
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return 'Time up';
  return `${Math.ceil(remainingMs / 60000)} min`;
}

const PAGE_SIZE = 6;

export default function MyExams() {
  const { data: exams, isLoading, isError } = useExams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'All');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | CreationMethod>('All');
  const [page, setPage] = useState(1);

  // Only Published exams are relevant to a student.
  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const attemptQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['submissions', 'mine', exam.id],
      queryFn: () => getMyAttempt(exam.id),
      enabled: !!exams,
    })),
  });

  // The assignment's own attempt limit (set per-assignment in the Assign
  // Exam wizard) overrides the exam's default - matches StartAttemptHandler's
  // `assignment?.MaxAttempts ?? exam.MaxAttempts` fallback on the backend.
  // Its start/end window also drives Start Date/Due Date and the
  // Upcoming-vs-Expired split below, same reasoning Active Exams already
  // applies on the admin side (an exam's own startAtUtc/endAtUtc are rarely
  // set - the real window lives on the assignment).
  const assignmentQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['assignments', 'mine', exam.id],
      queryFn: () => getMyAssignmentForExam(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingAttempts = publishedExams.length > 0 && attemptQueries.some((q) => q.isLoading);

  const rows: ExamRow[] = publishedExams.map((exam, index) => {
    const attempt = attemptQueries[index]?.data;
    const assignment = assignmentQueries[index]?.data;
    const maxAttempts = assignment?.maxAttempts ?? exam.maxAttempts;
    const startAtUtc = assignment?.startAtUtc ?? exam.startAtUtc;
    const endAtUtc = assignment?.endAtUtc ?? exam.endAtUtc;

    let rowStatus: RowStatus;
    if (!attempt) {
      const windowExpired = !!(startAtUtc && endAtUtc) && getAssignmentStatus(startAtUtc, endAtUtc) === 'Expired';
      rowStatus = windowExpired ? 'Expired' : 'Upcoming';
    } else if (attempt.attempt.status === 'InProgress') {
      rowStatus = 'In Progress';
    } else {
      rowStatus = 'Completed';
    }

    // A submitted attempt doesn't mean the exam is done for good - the
    // student can still retake it up to maxAttempts times.
    const hasRetakesLeft = rowStatus === 'Completed' && attempt!.attempt.attemptNumber < maxAttempts;
    return {
      ...exam,
      rowStatus,
      hasRetakesLeft,
      startAtUtc,
      endAtUtc,
      attemptStartedAtUtc: attempt?.attempt.startedAtUtc ?? null,
    };
  });

  const counts = {
    total: rows.length,
    upcoming: rows.filter((r) => r.rowStatus === 'Upcoming').length,
    inProgress: rows.filter((r) => r.rowStatus === 'In Progress').length,
    completed: rows.filter((r) => r.rowStatus === 'Completed').length,
  };

  const tabRows = tab === 'All' ? rows : rows.filter((row) => row.rowStatus === tab);

  const filteredExams = tabRows.filter((exam) => {
    if (typeFilter !== 'All' && exam.creationMethod !== typeFilter) {
      return false;
    }
    const search = searchText.trim().toLowerCase();
    if (search && !exam.title.toLowerCase().includes(search) && !exam.category.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [tab, typeFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExams = filteredExams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredExams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredExams.length);

  const loading = isLoading || isLoadingAttempts;

  return (
    <StudentLayout active="My Exams">
      <h1 className="h4 fw-bold mb-1 text-primary">My Exams</h1>
      <p className="text-muted mb-4">View and start your assigned exams.</p>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Exams</div>
              <div className="h4 fw-bold mb-0">{counts.total}</div>
              <div className="text-muted small">Assigned to you</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Upcoming</div>
              <div className="h4 fw-bold mb-0 text-primary">{counts.upcoming}</div>
              <div className="text-muted small">Not started</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">In Progress</div>
              <div className="h4 fw-bold mb-0 text-warning">{counts.inProgress}</div>
              <div className="text-muted small">Ongoing</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Completed</div>
              <div className="h4 fw-bold mb-0 text-success">{counts.completed}</div>
              <div className="text-muted small">Finished</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className="pb-0">
          <div className="d-flex gap-4 border-bottom mb-3">
            {TABS.map((t) => (
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
                {t === 'All' ? 'All Exams' : t}
              </button>
            ))}
          </div>

          <Row className="g-2 mb-3">
            <Col md={6}>
              <Form.Control
                type="search"
                placeholder="Search exam by title or subject..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'All' | CreationMethod)}
              >
                <option value="All">All Creation Methods</option>
                <option value="Manual">Manual</option>
                <option value="AiGenerated">AI Generated</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
                <option value="All">All Status</option>
                <option value="Upcoming">Upcoming</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Expired">Expired</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>

        <Card.Body className={loading || isError || pagedExams.length === 0 ? 'pt-0' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && isError && (
            <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
          )}

          {!loading && !isError && pagedExams.length === 0 && (
            <div className="text-center text-muted py-5">
              {tab === 'All' ? 'No exams match your search/filter.' : 'Nothing here yet.'}
            </div>
          )}

          {!loading && !isError && pagedExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam Details</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedExams.map((exam) => {
                  const start = formatDateTime(exam.startAtUtc);
                  const due = formatDateTime(exam.endAtUtc);
                  const dueUrgent = exam.rowStatus === 'Upcoming' || exam.rowStatus === 'In Progress';
                  return (
                    <tr key={exam.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <ExamRowIcon examId={exam.id} />
                          <div>
                            <div className="fw-medium">{exam.title}</div>
                            <div className="text-muted small">{exam.category}</div>
                            <Badge bg="light" text="dark" className="border">
                              {creationMethodLabel[exam.creationMethod]}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td>Online Exam</td>
                      <td>{exam.durationMinutes} min</td>
                      <td>
                        <div>{start.date}</div>
                        <div className="text-muted small">{start.time}</div>
                      </td>
                      <td>
                        <div className={dueUrgent ? 'text-danger fw-medium' : 'text-muted'}>{due.date}</div>
                        <div className={dueUrgent ? 'text-danger small' : 'text-muted small'}>{due.time}</div>
                      </td>
                      <td>
                        <Badge bg={statusVariant[exam.rowStatus]}>{exam.rowStatus}</Badge>
                      </td>
                      <td className="pe-4">
                        {exam.rowStatus === 'Upcoming' && (
                          <div className="d-flex align-items-center gap-2">
                            <Link to={`/exams/${exam.id}`} className="btn btn-outline-primary btn-sm">
                              Start Exam
                            </Link>
                            <Link to={`/exams/${exam.id}`} className="text-muted" title="View details">
                              →
                            </Link>
                          </div>
                        )}
                        {exam.rowStatus === 'In Progress' && (
                          <div>
                            <Link to={`/exams/${exam.id}/take`} className="btn btn-warning btn-sm">
                              Resume Exam
                            </Link>
                            <div className="text-muted small mt-1">
                              Time Left: {timeLeftLabel(exam.attemptStartedAtUtc, exam.durationMinutes)}
                            </div>
                          </div>
                        )}
                        {exam.rowStatus === 'Completed' && (
                          <div className="d-flex flex-column align-items-start gap-1">
                            <Link to={`/results/${exam.id}`} className="btn btn-outline-secondary btn-sm">
                              View Result →
                            </Link>
                            {exam.hasRetakesLeft && (
                              <Link to={`/exams/${exam.id}`} className="btn btn-link btn-sm p-0">
                                Retake Exam
                              </Link>
                            )}
                          </div>
                        )}
                        {exam.rowStatus === 'Expired' && <span className="text-muted">--</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!loading && !isError && filteredExams.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredExams.length} exams
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
    </StudentLayout>
  );
}
