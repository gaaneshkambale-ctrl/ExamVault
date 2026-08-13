import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteExamButton from '../../components/DeleteExamButton';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import type { ExamResponse, ExamStatus, ExamType } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function TotalExamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
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
      <path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArchivedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  variant: string;
  icon: ReactNode;
}

function StatCard({ label, value, variant, icon }: StatCardProps) {
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
            <div className="h4 fw-bold mb-0">{value}</div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

const PAGE_SIZE = 6;

export default function ManageExams() {
  const { data: exams, isLoading, isError } = useExams();
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | ExamType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ExamStatus>('All');
  const [page, setPage] = useState(1);

  const counts = {
    total: exams?.length ?? 0,
    published: exams?.filter((e) => e.status === 'Published').length ?? 0,
    draft: exams?.filter((e) => e.status === 'Draft').length ?? 0,
    archived: exams?.filter((e) => e.status === 'Archived').length ?? 0,
  };

  const filteredExams: ExamResponse[] = (exams ?? []).filter((exam) => {
    if (typeFilter !== 'All' && exam.examType !== typeFilter) {
      return false;
    }
    if (statusFilter !== 'All' && exam.status !== statusFilter) {
      return false;
    }
    if (searchText.trim() && !exam.title.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [searchText, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExams = filteredExams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredExams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredExams.length);

  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Exams</h1>
        <Link to="/admin/exams/create" className="btn btn-primary">
          + Create Exam
        </Link>
      </div>

      <Row className="g-3 mb-4">
        <StatCard label="Total Exams" value={counts.total} variant="primary" icon={<TotalExamsIcon />} />
        <StatCard label="Published" value={counts.published} variant="success" icon={<PublishedIcon />} />
        <StatCard label="Draft" value={counts.draft} variant="warning" icon={<DraftIcon />} />
        <StatCard label="Archived" value={counts.archived} variant="dark" icon={<ArchivedIcon />} />
      </Row>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search exams..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'All' | ExamType)}
          >
            <option value="All">All Types</option>
            <option value="Manual">Manual</option>
            <option value="AiGenerated">AI Generated</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | ExamStatus)}
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredExams.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load exams. Please try again.
            </div>
          )}

          {!isLoading && !isError && exams?.length === 0 && (
            <div className="text-center text-muted py-5">
              No exams yet. Click "+ Create Exam" to add one.
            </div>
          )}

          {!isLoading && !isError && exams && exams.length > 0 && filteredExams.length === 0 && (
            <div className="text-center text-muted py-5">
              No exams match your search/filter.
            </div>
          )}

          {!isLoading && !isError && filteredExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Title</th>
                  <th>Type</th>
                  <th>Total Questions</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="ps-4 fw-medium">{exam.title}</td>
                    <td>{examTypeLabel[exam.examType]}</td>
                    <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                    <td>{exam.durationMinutes} min</td>
                    <td>{exam.totalMarks}</td>
                    <td>
                      <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                    </td>
                    <td>{new Date(exam.createdOn).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/exams/${exam.id}`}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/exams/${exam.id}/edit`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          Edit
                        </Link>
                        <DeleteExamButton examId={exam.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredExams.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredExams.length} entries
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
    </AdminLayout>
  );
}
