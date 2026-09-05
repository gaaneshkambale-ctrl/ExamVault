import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon, EditIcon } from '../../components/icons/ActionIcons';
import { useAssignments, useCancelAssignment } from '../../hooks/useAssignments';
import { useExams, useExamTypes } from '../../hooks/useExams';
import { getScheduleStatus } from '../../types/assignment';
import type { ScheduleStatus } from '../../types/assignment';
import { isWithinRange } from '../../utils/dateRange';
import { extractServerError } from '../../utils/apiError';

const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<ScheduleStatus, string> = {
  Upcoming: 'primary',
  StartingToday: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
};

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  Upcoming: 'Upcoming',
  StartingToday: 'Starting Today',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

function formatDuration(startAtUtc: string, endAtUtc: string): string {
  const minutes = Math.round((new Date(endAtUtc).getTime() - new Date(startAtUtc).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

interface StatCardProps {
  label: string;
  value: number;
  variant: string;
}

function StatCard({ label, value, variant }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={2}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <div className="text-muted small">{label}</div>
          <div className={`h4 fw-bold mb-0 text-${variant}`}>{value}</div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function ExamScheduled() {
  const { data: assignments, isLoading, isError } = useAssignments();
  const { data: exams } = useExams();
  const { data: examTypes } = useExamTypes();
  const cancelMutation = useCancelAssignment();

  const [search, setSearch] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ScheduleStatus>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; examTitle: string } | null>(null);

  // Assignments don't carry an exam-type field of their own - cross
  // referencing against the exam list, same client-side-join convention
  // already used for exam-type reporting elsewhere in this codebase.
  const examTypeByExamId = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams ?? []) {
      if (exam.examTypeName) map.set(exam.id, exam.examTypeName);
    }
    return map;
  }, [exams]);

  const rows = useMemo(
    () =>
      (assignments ?? []).map((a) => ({
        ...a,
        examTypeName: examTypeByExamId.get(a.examId) ?? null,
        status: getScheduleStatus(a),
      })),
    [assignments, examTypeByExamId],
  );

  const filteredRows = rows.filter((r) => {
    if (search.trim() && !r.examTitle.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (examTypeFilter !== 'All' && r.examTypeName !== examTypeFilter) {
      return false;
    }
    if (statusFilter !== 'All' && r.status !== statusFilter) {
      return false;
    }
    if (startDate && endDate && !isWithinRange(r.startAtUtc, { from: startDate, to: endDate })) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [search, examTypeFilter, statusFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  const counts = {
    total: rows.length,
    upcoming: rows.filter((r) => r.status === 'Upcoming').length,
    startingToday: rows.filter((r) => r.status === 'StartingToday').length,
    completed: rows.filter((r) => r.status === 'Completed').length,
    cancelled: rows.filter((r) => r.status === 'Cancelled').length,
  };

  async function confirmCancel() {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      setCancelTarget(null);
    } catch {
      // Leave the modal open with the mutation's error state visible.
    }
  }

  return (
    <AdminLayout active="Exam Scheduled">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Exam Scheduled</h1>
          <p className="text-muted mb-0">View and manage all scheduled exam sittings</p>
        </div>
        <Link to="/admin/assignments/new" className="btn btn-primary">
          + Schedule New Exam
        </Link>
      </div>

      <Row className="g-3 mb-4">
        <StatCard label="Total Scheduled" value={counts.total} variant="dark" />
        <StatCard label="Upcoming" value={counts.upcoming} variant="primary" />
        <StatCard label="Starting Today" value={counts.startingToday} variant="warning" />
        <StatCard label="Completed" value={counts.completed} variant="success" />
        <StatCard label="Cancelled" value={counts.cancelled} variant="danger" />
      </Row>

      <Row className="g-2 mb-3">
        <Col md={3}>
          <Form.Control
            type="search"
            placeholder="Search exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            {(examTypes ?? []).map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | ScheduleStatus)}
          >
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="StartingToday">Starting Today</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Control
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredRows.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load scheduled exams. Please try again.</div>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              No exams scheduled yet. Click "+ Schedule New Exam" to add one.
            </div>
          )}

          {!isLoading && !isError && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No scheduled exams match your search/filter.</div>
          )}

          {!isLoading && !isError && filteredRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">#</th>
                  <th>Exam Name</th>
                  <th>Exam Type</th>
                  <th>Start Date &amp; Time</th>
                  <th>End Date &amp; Time</th>
                  <th>Duration</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="ps-4">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="fw-medium">{r.examTitle}</td>
                    <td>{r.examTypeName ?? '—'}</td>
                    <td>{new Date(r.startAtUtc).toLocaleString()}</td>
                    <td>{new Date(r.endAtUtc).toLocaleString()}</td>
                    <td>{formatDuration(r.startAtUtc, r.endAtUtc)}</td>
                    <td>{r.targetCount.toLocaleString()}</td>
                    <td>
                      <Badge bg={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/reports/${r.examId}`}
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="View exam report"
                          aria-label={`View report for ${r.examTitle}`}
                        >
                          <ViewIcon />
                        </Link>
                        <Link
                          to={`/admin/assignments/${r.id}/edit`}
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Edit schedule"
                          aria-label={`Edit schedule for ${r.examTitle}`}
                        >
                          <EditIcon />
                        </Link>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          disabled={r.status === 'Cancelled' || r.status === 'Completed'}
                          onClick={() => setCancelTarget({ id: r.id, examTitle: r.examTitle })}
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredRows.length > 0 && (
        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={filteredRows.length}
          onPageChange={setPage}
        />
      )}

      <Modal show={!!cancelTarget} onHide={() => setCancelTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Scheduled Exam</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelMutation.isError && (
            <div className="text-danger small mb-3">{extractServerError(cancelMutation.error)}</div>
          )}
          Cancel <strong>{cancelTarget?.examTitle}</strong>? Students will no longer be able to take this
          scheduled sitting. This can't be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCancelTarget(null)}>
            Keep It
          </Button>
          <Button variant="danger" disabled={cancelMutation.isPending} onClick={confirmCancel}>
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Exam'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
