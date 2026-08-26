import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteExamButton from '../../components/DeleteExamButton';
import { EditIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { archiveExam, deleteExam } from '../../api/examApi';
import { extractServerError } from '../../utils/apiError';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { CreationMethod, ExamResponse, ExamStatus } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const creationMethodLabel: Record<CreationMethod, string> = {
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

const VALID_STATUSES: ExamStatus[] = ['Draft', 'Published', 'Archived'];

export default function ManageExams() {
  const { data: exams, isLoading, isError } = useExams();
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | CreationMethod>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ExamStatus>(() => {
    const fromUrl = searchParams.get('status');
    return VALID_STATUSES.includes(fromUrl as ExamStatus) ? (fromUrl as ExamStatus) : 'All';
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const counts = {
    total: exams?.length ?? 0,
    published: exams?.filter((e) => e.status === 'Published').length ?? 0,
    draft: exams?.filter((e) => e.status === 'Draft').length ?? 0,
    archived: exams?.filter((e) => e.status === 'Archived').length ?? 0,
  };

  const filteredExams: ExamResponse[] = (exams ?? []).filter((exam) => {
    if (typeFilter !== 'All' && exam.creationMethod !== typeFilter) {
      return false;
    }
    if (categoryFilter !== 'All' && exam.category !== categoryFilter) {
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
    setSelected(new Set());
  }, [searchText, typeFilter, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExams = filteredExams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredExams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredExams.length);

  const allPageSelected = pagedExams.length > 0 && pagedExams.every((e) => selected.has(e.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedExams.forEach((e) => next.delete(e.id));
      } else {
        pagedExams.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invalidateExams = () => queryClient.invalidateQueries({ queryKey: ['exams'] });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => archiveExam(id))),
    onSuccess: () => {
      invalidateExams();
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => deleteExam(id))),
    onSuccess: () => {
      invalidateExams();
      setSelected(new Set());
      setShowBulkDeleteConfirm(false);
    },
  });

  const bulkError = bulkDeleteMutation.isError ? extractServerError(bulkDeleteMutation.error) : '';

  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Exams</h1>
          <p className="text-muted mb-0">View and manage all exams in the system</p>
        </div>
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
        <Col md={4}>
          <Form.Control
            type="search"
            placeholder="Search exams..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {EXAM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Form.Select>
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
        <Col md={2}>
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
            <>
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                <Form.Check
                  type="checkbox"
                  label="Select All"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                />
                {selected.size > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">{selected.size} selected</span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={bulkArchiveMutation.isPending}
                      onClick={() => bulkArchiveMutation.mutate(Array.from(selected))}
                    >
                      {bulkArchiveMutation.isPending ? 'Archiving...' : 'Archive Selected'}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase table-light">
                  <tr>
                    <th className="ps-4" style={{ width: 40 }}></th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Exam Type</th>
                    <th>Creation Method</th>
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
                      <td className="ps-4">
                        <Form.Check
                          type="checkbox"
                          checked={selected.has(exam.id)}
                          onChange={() => toggleOne(exam.id)}
                        />
                      </td>
                      <td className="fw-medium">{exam.title}</td>
                      <td>{exam.category || '—'}</td>
                      <td>{exam.examTypeName || '—'}</td>
                      <td>{creationMethodLabel[exam.creationMethod]}</td>
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
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View"
                            aria-label={`View ${exam.title}`}
                          >
                            <ViewIcon />
                          </Link>
                          <Link
                            to={`/admin/exams/${exam.id}/edit`}
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Edit"
                            aria-label={`Edit ${exam.title}`}
                          >
                            <EditIcon />
                          </Link>
                          <DeleteExamButton examId={exam.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
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

      <Modal show={showBulkDeleteConfirm} onHide={() => setShowBulkDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete {selected.size} Exam{selected.size === 1 ? '' : 's'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkError && <Alert variant="danger">{bulkError}</Alert>}
          Are you sure you want to delete the selected exam{selected.size === 1 ? '' : 's'}? This cannot be
          undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
