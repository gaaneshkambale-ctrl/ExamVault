import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Col, Modal, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import MiniCalendar from '../../components/MiniCalendar';
import { EditIcon } from '../../components/icons/ActionIcons';
import { useAssignments, useCancelAssignment } from '../../hooks/useAssignments';
import { useExams } from '../../hooks/useExams';
import { useActiveExamCards } from '../../hooks/useActiveExamCards';
import { getScheduleStatus } from '../../types/assignment';
import type { ScheduleStatus } from '../../types/assignment';
import { extractServerError } from '../../utils/apiError';

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

function isSameLocalDay(isoUtc: string, reference: Date): boolean {
  const d = new Date(isoUtc);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

function formatTimeRange(startAtUtc: string, endAtUtc: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${new Date(startAtUtc).toLocaleTimeString([], opts)} - ${new Date(endAtUtc).toLocaleTimeString([], opts)}`;
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

interface DayScheduleRow {
  id: string;
  examId: string;
  examTitle: string;
  examTypeName: string | null;
  startAtUtc: string;
  endAtUtc: string;
  targetCount: number;
  status: ScheduleStatus;
}

interface DayScheduleCardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  rows: DayScheduleRow[];
  emptyText: string;
  onCancel: (target: { id: string; examTitle: string }) => void;
}

function DayScheduleCard({ icon, iconBg, title, rows, emptyText, onCancel }: DayScheduleCardProps) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
            style={{ width: 32, height: 32, background: iconBg }}
          >
            {icon}
          </div>
          <span className="fw-bold">{title}</span>
        </div>
        {rows.length === 0 ? (
          <div className="text-muted small text-center py-4">{emptyText}</div>
        ) : (
          <Table responsive size="sm" className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase">
              <tr>
                <th>Exam Name</th>
                <th>Exam Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Students</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="fw-medium">{r.examTitle}</td>
                  <td className="text-muted">{r.examTypeName ?? '—'}</td>
                  <td className="text-nowrap">{new Date(r.startAtUtc).toLocaleDateString()}</td>
                  <td className="text-nowrap">{formatTimeRange(r.startAtUtc, r.endAtUtc)}</td>
                  <td>
                    <Badge bg="light" text="dark" className="fw-normal">
                      {r.targetCount.toLocaleString()}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Link
                        to={`/admin/reports/${r.examId}`}
                        className="btn btn-outline-secondary btn-sm"
                        title="View exam report"
                      >
                        View
                      </Link>
                      <Link
                        to={`/admin/assignments/${r.id}/edit`}
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ width: 31 }}
                        title="Edit schedule"
                        aria-label={`Edit schedule for ${r.examTitle}`}
                      >
                        <EditIcon />
                      </Link>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={r.status === 'Cancelled' || r.status === 'Completed'}
                        onClick={() => onCancel({ id: r.id, examTitle: r.examTitle })}
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
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LiveExamsPanel() {
  const { cards, isLoading, isError } = useActiveExamCards();

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <Badge bg="danger" className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1">
              <span
                className="rounded-circle bg-white d-inline-block"
                style={{ width: 6, height: 6 }}
              />
              LIVE
            </Badge>
            <span className="fw-bold">Live Exams (Currently Running)</span>
          </div>
          <Link to="/admin/live-monitoring/active-exams" className="small text-decoration-none">
            View All Live Exams →
          </Link>
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="text-center text-danger small py-3">Couldn't load live exams.</div>
        )}

        {!isLoading && !isError && cards.length === 0 && (
          <div className="text-center text-muted small py-3">No exams are currently in progress.</div>
        )}

        {!isLoading && !isError && cards.length > 0 && (
          <Table responsive className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase">
              <tr>
                <th>Exam Name</th>
                <th>Started At</th>
                <th>Duration</th>
                <th>Students</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const pct =
                  card.totalAssigned > 0 ? Math.round((card.completedCount / card.totalAssigned) * 100) : 0;
                return (
                  <tr key={card.exam.id}>
                    <td>
                      <div className="fw-medium">{card.exam.title}</div>
                      <div className="text-muted small">{card.exam.category}</div>
                    </td>
                    <td className="text-nowrap">
                      {card.startAtUtc
                        ? new Date(card.startAtUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>{card.exam.durationMinutes} min</td>
                    <td>
                      <div>
                        {card.inProgress.length} / {card.totalAssigned}
                      </div>
                      <div className="text-success small">online</div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="d-flex align-items-center gap-2">
                        <ProgressBar now={pct} className="flex-grow-1" style={{ height: 6 }} />
                        <span className="small text-muted">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/admin/exams/${card.exam.id}`} className="btn btn-outline-primary btn-sm">
                        Monitor
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
  );
}

export default function ExamScheduled() {
  const { data: assignments } = useAssignments();
  const { data: exams } = useExams();
  const cancelMutation = useCancelAssignment();

  const [cancelTarget, setCancelTarget] = useState<{ id: string; examTitle: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayRows = rows.filter((r) => isSameLocalDay(r.startAtUtc, today));
  const tomorrowRows = rows.filter((r) => isSameLocalDay(r.startAtUtc, tomorrow));
  const selectedDateRows = rows.filter((r) => isSameLocalDay(r.startAtUtc, selectedDate));

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
    <AdminLayout active="Scheduled Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Scheduled Exams</h1>
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

      <LiveExamsPanel />

      <Row className="g-3 mb-4">
        <Col xs={12} lg={4}>
          <DayScheduleCard
            icon={<CalendarIcon />}
            iconBg="#dbeafe"
            title="Today's Scheduled Exams"
            rows={todayRows}
            emptyText="No exams scheduled for today."
            onCancel={setCancelTarget}
          />
        </Col>
        <Col xs={12} lg={4}>
          <DayScheduleCard
            icon={<CalendarIcon />}
            iconBg="#fef3c7"
            title="Tomorrow's Scheduled Exams"
            rows={tomorrowRows}
            emptyText="No exams scheduled for tomorrow."
            onCancel={setCancelTarget}
          />
        </Col>
        <Col xs={12} lg={4}>
          <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col xs={12}>
          <DayScheduleCard
            icon={<CalendarIcon />}
            iconBg="#ede9fe"
            title={`Exams on ${selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
            rows={selectedDateRows}
            emptyText="No exams scheduled on this date."
            onCancel={setCancelTarget}
          />
        </Col>
      </Row>

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
