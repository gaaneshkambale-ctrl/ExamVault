import { useState } from 'react';
import { Badge, Card, Col, Form, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import UserAvatar from '../../../components/UserAvatar';
import { useUsers } from '../../../hooks/useUsers';
import { useActiveExamCards, type ActiveExamStatus } from '../../../hooks/useActiveExamCards';
import { attemptViolationCount } from '../../../utils/proctoring';
import { EXAM_CATEGORIES } from '../../../types/exam';

const statusMeta: Record<ActiveExamStatus, { label: string; badgeBg: string; borderColor: string }> = {
  InProgress: { label: 'IN PROGRESS', badgeBg: 'success', borderColor: '#198754' },
  EndingSoon: { label: 'ENDING SOON', badgeBg: 'danger', borderColor: '#dc3545' },
  NeedsReview: { label: 'NEEDS REVIEW', badgeBg: 'warning', borderColor: '#ffc107' },
};

function formatTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveExams() {
  const { cards: allCards, isLoading: loading, isError: isExamsError } = useActiveExamCards();
  const { data: users } = useUsers();
  const [examNameFilter, setExamNameFilter] = useState<'All' | string>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const userById = new Map<string, { fullName: string; hasPhoto: boolean }>();
  for (const user of users ?? []) {
    userById.set(user.id, { fullName: user.fullName, hasPhoto: user.hasPhoto });
  }

  // Dropdown options are derived from the currently-active exams only,
  // matching this page's live-monitoring scope - no point offering a name
  // that has no active card to filter down to.
  const examNameOptions = Array.from(new Set(allCards.map((card) => card.exam.title))).sort((a, b) =>
    a.localeCompare(b),
  );

  const cards = allCards.filter((card) => {
    if (categoryFilter !== 'All' && card.exam.category !== categoryFilter) {
      return false;
    }
    if (examNameFilter !== 'All' && card.exam.title !== examNameFilter) {
      return false;
    }
    return true;
  });

  const totals = {
    totalActive: allCards.length,
    studentsTesting: allCards.reduce((sum, c) => sum + c.inProgress.length, 0),
    alerts: allCards.reduce(
      (sum, c) => sum + c.inProgress.filter((a) => attemptViolationCount(a) > 0).length,
      0,
    ),
  };

  return (
    <AdminLayout active="Active Exams">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Active Exams</h1>
          <p className="text-muted mb-0">Live monitoring of all exams currently in progress.</p>
        </div>
        <div className="btn-group" role="group" aria-label="View mode">
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>

      <Row className="g-3 mb-4 mt-1">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Active</div>
              <div className="h4 fw-bold mb-0">{totals.totalActive}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Students Testing</div>
              <div className="h4 fw-bold mb-0 text-success">{totals.studentsTesting}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Alerts</div>
              <div className="h4 fw-bold mb-0 text-danger">{totals.alerts}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={4}>
          <Form.Select value={examNameFilter} onChange={(e) => setExamNameFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {examNameOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            {EXAM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isExamsError && !loading && (
        <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
      )}

      {!loading && !isExamsError && allCards.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            No exams are currently in progress.
          </Card.Body>
        </Card>
      )}

      {!loading && !isExamsError && allCards.length > 0 && cards.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No active exams match your filters.</Card.Body>
        </Card>
      )}

      {!loading && !isExamsError && cards.length > 0 && viewMode === 'grid' && (
        <Row className="g-3">
          {cards.map((card) => {
            const meta = statusMeta[card.status];
            const pct =
              card.totalAssigned > 0 ? Math.round((card.completedCount / card.totalAssigned) * 100) : 0;
            const shownAvatars = card.inProgress.slice(0, 3);
            const overflow = card.inProgress.length - shownAvatars.length;

            return (
              <Col xs={12} sm={6} lg={3} key={card.exam.id}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderLeft: `4px solid ${meta.borderColor}` }}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={meta.badgeBg}>{meta.label}</Badge>
                    </div>
                    <div className="fw-bold mb-1">{card.exam.title}</div>
                    <div className="text-muted small mb-3">{card.exam.category}</div>

                    <Row className="g-2 small mb-3">
                      <Col xs={6}>
                        <div className="text-muted">Time Started</div>
                        <div className="fw-medium">{formatTime(card.startAtUtc)}</div>
                      </Col>
                      <Col xs={6}>
                        <div className="text-muted">Expected End</div>
                        <div className="fw-medium">{formatTime(card.endAtUtc)}</div>
                      </Col>
                    </Row>

                    <div className="small text-muted mb-1">
                      Students Completed{' '}
                      <span className="float-end">
                        {card.completedCount}/{card.totalAssigned} ({pct}%)
                      </span>
                    </div>
                    <ProgressBar now={pct} className="mb-3" style={{ height: 6 }} />

                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {shownAvatars.map((attempt) => {
                          const user = userById.get(attempt.userId);
                          return (
                            <div key={attempt.id} style={{ marginLeft: -8 }}>
                              <UserAvatar
                                userId={attempt.userId}
                                fullName={user?.fullName ?? 'Student'}
                                hasPhoto={user?.hasPhoto ?? false}
                                size={28}
                              />
                            </div>
                          );
                        })}
                        {overflow > 0 && (
                          <span
                            className="text-muted small"
                            style={{ marginLeft: shownAvatars.length > 0 ? 4 : 0 }}
                          >
                            +{overflow}
                          </span>
                        )}
                      </div>
                      <Link to={`/admin/exams/${card.exam.id}`} className="small text-decoration-none">
                        View Details →
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {!loading && !isExamsError && cards.length > 0 && viewMode === 'list' && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Exam</th>
                  <th>Status</th>
                  <th>Students Testing</th>
                  <th>Completed</th>
                  <th>Time Started</th>
                  <th>Expected End</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const meta = statusMeta[card.status];
                  const pct =
                    card.totalAssigned > 0 ? Math.round((card.completedCount / card.totalAssigned) * 100) : 0;
                  return (
                    <tr key={card.exam.id}>
                      <td className="ps-4 fw-medium">
                        {card.exam.title}
                        <div className="text-muted small fw-normal">{card.exam.category}</div>
                      </td>
                      <td>
                        <Badge bg={meta.badgeBg}>{meta.label}</Badge>
                      </td>
                      <td>{card.inProgress.length}</td>
                      <td>
                        {card.completedCount}/{card.totalAssigned} ({pct}%)
                      </td>
                      <td>{formatTime(card.startAtUtc)}</td>
                      <td>{formatTime(card.endAtUtc)}</td>
                      <td className="pe-4">
                        <Link to={`/admin/exams/${card.exam.id}`} className="small text-decoration-none">
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}
