import { useMemo } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import InstructorLayout from '../../layouts/InstructorLayout';
import { ViewIcon, EditIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { useExams } from '../../hooks/useExams';
import type { ExamStatus } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const RECENT_EXAMS_COUNT = 8;

function ExamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
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

function DraftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4 d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 44, height: 44, background: `${color}1a`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="h4 fw-bold mb-0">{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { data: exams, isLoading } = useExams();

  const stats = useMemo(() => {
    const list = exams ?? [];
    return {
      total: list.length,
      published: list.filter((e) => e.status === 'Published').length,
      draft: list.filter((e) => e.status === 'Draft').length,
    };
  }, [exams]);

  const recentExams = useMemo(
    () =>
      [...(exams ?? [])]
        .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())
        .slice(0, RECENT_EXAMS_COUNT),
    [exams],
  );

  return (
    <InstructorLayout active="Dashboard">
      <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName ?? 'Instructor'}!</h1>
      <p className="text-muted mb-4">Here's an overview of the exams you've authored.</p>

      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <StatCard label="Total Exams" value={stats.total} icon={<ExamsIcon />} color="#4f46e5" />
            </Col>
            <Col md={4}>
              <StatCard label="Published" value={stats.published} icon={<PublishedIcon />} color="#16a34a" />
            </Col>
            <Col md={4}>
              <StatCard label="Draft" value={stats.draft} icon={<DraftIcon />} color="#64748b" />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="fw-bold">My Recent Exams</div>
                <Link to="/admin/exams" className="small text-decoration-none">
                  View All
                </Link>
              </div>
              {recentExams.length === 0 ? (
                <div className="text-center text-muted py-4">
                  No exams yet. <Link to="/admin/exams/create">Create your first exam</Link>.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr className="text-muted small text-uppercase">
                        <th>Title</th>
                        <th>Status</th>
                        <th>Questions</th>
                        <th>Created</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExams.map((exam) => (
                        <tr key={exam.id}>
                          <td>{exam.title}</td>
                          <td>
                            <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                          </td>
                          <td>{exam.totalQuestions}</td>
                          <td>{new Date(exam.createdOn).toLocaleDateString()}</td>
                          <td className="text-end">
                            <Link to={`/admin/exams/${exam.id}`} className="btn btn-outline-secondary btn-sm me-2">
                              <ViewIcon />
                            </Link>
                            <Link to={`/admin/exams/${exam.id}/edit`} className="btn btn-outline-primary btn-sm">
                              <EditIcon />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </InstructorLayout>
  );
}
