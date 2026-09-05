import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Dropdown, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import DeleteExamButton from '../../components/DeleteExamButton';
import { EditIcon, ViewIcon, BarChartIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useExams, useExamTypes } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { archiveExam, deleteExam } from '../../api/examApi';
import { extractServerError } from '../../utils/apiError';
import { bucketByDay } from '../../utils/dateRange';
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

// Fixed palette keyed by the real category list (types/exam.ts) - cycling
// deterministically rather than by hash, so the same category always gets
// the same color across sessions/reloads.
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Technical: { bg: '#dbeafe', color: '#1d4ed8' },
  Database: { bg: '#ffedd5', color: '#c2410c' },
  Aptitude: { bg: '#fce7f3', color: '#be185d' },
  Programming: { bg: '#ede9fe', color: '#6d28d9' },
  'Soft Skills': { bg: '#dcfce7', color: '#15803d' },
  General: { bg: '#f1f5f9', color: '#475569' },
};
const DEFAULT_CATEGORY_COLOR = { bg: '#f1f5f9', color: '#475569' };

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

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 17l-1.8-5.8L4.6 9.4l5.6-1.8L12 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// Small last-7-days trend line, driven by real exam createdOn dates (not
// decorative) - reuses the same day-bucketing already used across Reports.
function Sparkline({ dates, color }: { dates: string[]; color: string }) {
  const buckets = bucketByDay(dates, {
    from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const width = 72;
  const height = 28;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = width / Math.max(1, buckets.length - 1);
  const points = buckets
    .map((b, i) => `${i * stepX},${height - (b.count / max) * (height - 4) - 2}`)
    .join(' ');

  if (buckets.every((b) => b.count === 0)) {
    return null;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  percent: string | null;
  variant: string;
  icon: ReactNode;
  trendDates: string[];
  trendColor: string;
}

function StatCard({ label, value, percent, variant, icon, trendDates, trendColor }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
              style={{ width: 44, height: 44 }}
            >
              {icon}
            </div>
            <div>
              <div className="text-muted small">{label}</div>
              <div className="h4 fw-bold mb-0">{value}</div>
              {percent && <div className="text-muted" style={{ fontSize: 11 }}>{percent}</div>}
            </div>
          </div>
          <Sparkline dates={trendDates} color={trendColor} />
        </Card.Body>
      </Card>
    </Col>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const VALID_STATUSES: ExamStatus[] = ['Draft', 'Published', 'Archived'];

export default function ManageExams() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  // Admin is never restricted here - only Instructor's own granted
  // permissions (which an Admin can revoke independently of role) gate
  // these actions, matching what ExamsController actually enforces.
  const canCreateExams = user?.role !== 'Instructor' || hasPermission('Exams - Create');
  const canEditExams = user?.role !== 'Instructor' || hasPermission('Exams - Edit');
  const { data: exams, isLoading, isError } = useExams();
  const { data: examTypes } = useExamTypes();
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | CreationMethod>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
  const [examTypeFilter, setExamTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ExamStatus>(() => {
    const fromUrl = searchParams.get('status');
    return VALID_STATUSES.includes(fromUrl as ExamStatus) ? (fromUrl as ExamStatus) : 'All';
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const counts = {
    total: exams?.length ?? 0,
    published: exams?.filter((e) => e.status === 'Published').length ?? 0,
    draft: exams?.filter((e) => e.status === 'Draft').length ?? 0,
    archived: exams?.filter((e) => e.status === 'Archived').length ?? 0,
  };
  const pct = (n: number) => (counts.total === 0 ? null : `${((n / counts.total) * 100).toFixed(1)}% of total`);
  const datesFor = (status: ExamStatus | null) =>
    (exams ?? []).filter((e) => status === null || e.status === status).map((e) => e.createdOn);

  function resetFilters() {
    setSearchText('');
    setTypeFilter('All');
    setCategoryFilter('All');
    setExamTypeFilter('All');
    setStatusFilter('All');
  }

  const filteredExams: ExamResponse[] = (exams ?? []).filter((exam) => {
    if (typeFilter !== 'All' && exam.creationMethod !== typeFilter) {
      return false;
    }
    if (categoryFilter !== 'All' && exam.category !== categoryFilter) {
      return false;
    }
    if (examTypeFilter !== 'All' && exam.examTypeName !== examTypeFilter) {
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
  }, [searchText, typeFilter, categoryFilter, examTypeFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedExams = filteredExams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const rangeStart = filteredExams.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredExams.length);

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

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveExam(id),
    onSuccess: invalidateExams,
  });

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
    <RoleAwareLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Exams</h1>
          <p className="text-muted mb-0">View and manage all exams in the system</p>
        </div>
        {canCreateExams && (
          <Link to="/admin/exams/create" className="btn btn-primary">
            + Create Exam
          </Link>
        )}
      </div>

      <Row className="g-3 mb-4">
        <StatCard
          label="Total Exams"
          value={counts.total}
          percent="All time"
          variant="primary"
          icon={<TotalExamsIcon />}
          trendDates={datesFor(null)}
          trendColor="#4f46e5"
        />
        <StatCard
          label="Published"
          value={counts.published}
          percent={pct(counts.published)}
          variant="success"
          icon={<PublishedIcon />}
          trendDates={datesFor('Published')}
          trendColor="#22c55e"
        />
        <StatCard
          label="Draft"
          value={counts.draft}
          percent={pct(counts.draft)}
          variant="warning"
          icon={<DraftIcon />}
          trendDates={datesFor('Draft')}
          trendColor="#f59e0b"
        />
        <StatCard
          label="Archived"
          value={counts.archived}
          percent={pct(counts.archived)}
          variant="dark"
          icon={<ArchivedIcon />}
          trendDates={datesFor('Archived')}
          trendColor="#6b7280"
        />
      </Row>

      <Row className="g-2 mb-3 align-items-center">
        <Col md={3}>
          <Form.Control
            type="search"
            placeholder="Search exams..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={2}>
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
        <Col md={2}>
          <Form.Select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)}>
            <option value="All">All Exam Types</option>
            {(examTypes ?? []).map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
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
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </Form.Select>
        </Col>
        <Col md={1}>
          <Button variant="outline-secondary" className="w-100" onClick={resetFilters}>
            Reset
          </Button>
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
                <thead className="text-muted small text-uppercase bg-body-tertiary">
                  <tr>
                    <th className="ps-4" style={{ width: 40 }}></th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Exam Type</th>
                    <th>Creation Method</th>
                    <th>Questions</th>
                    <th>Duration</th>
                    <th>Total Marks</th>
                    <th>Status</th>
                    <th>Created On</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedExams.map((exam) => {
                    const categoryColor = CATEGORY_COLORS[exam.category] ?? DEFAULT_CATEGORY_COLOR;
                    return (
                      <tr key={exam.id}>
                        <td className="ps-4">
                          <Form.Check
                            type="checkbox"
                            checked={selected.has(exam.id)}
                            onChange={() => toggleOne(exam.id)}
                          />
                        </td>
                        <td>
                          <div className="fw-medium">{exam.title}</div>
                          {exam.tags && <div className="text-muted small">{exam.tags}</div>}
                        </td>
                        <td>
                          {exam.category ? (
                            <span
                              className="badge rounded-pill fw-medium"
                              style={{ background: categoryColor.bg, color: categoryColor.color }}
                            >
                              {exam.category}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{exam.examTypeName || '—'}</td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1 text-muted small">
                            {exam.creationMethod === 'AiGenerated' ? <SparkleIcon /> : <PersonIcon />}
                            {creationMethodLabel[exam.creationMethod]}
                          </span>
                        </td>
                        <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1 text-muted small">
                            <ClockIcon /> {exam.durationMinutes} min
                          </span>
                        </td>
                        <td>{exam.totalMarks}</td>
                        <td>
                          <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                        </td>
                        <td>
                          <div>{new Date(exam.createdOn).toLocaleDateString()}</div>
                          <div className="text-muted small">
                            {new Date(exam.createdOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
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
                            {canEditExams && (
                              <Link
                                to={`/admin/exams/${exam.id}/edit`}
                                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                title="Edit"
                                aria-label={`Edit ${exam.title}`}
                              >
                                <EditIcon />
                              </Link>
                            )}
                            <Link
                              to={`/admin/reports/${exam.id}`}
                              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="View Results"
                              aria-label={`View results for ${exam.title}`}
                            >
                              <BarChartIcon />
                            </Link>
                            <DeleteExamButton examId={exam.id} />
                            <Dropdown>
                              <Dropdown.Toggle
                                as="button"
                                bsPrefix="btn"
                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                aria-label={`More actions for ${exam.title}`}
                              >
                                <KebabIcon />
                              </Dropdown.Toggle>
                              <Dropdown.Menu align="end">
                                <Dropdown.Item
                                  disabled={exam.status === 'Archived' || archiveMutation.isPending}
                                  onClick={() => archiveMutation.mutate(exam.id)}
                                >
                                  Archive
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          <div className="d-flex align-items-center gap-3">
            <Pagination className="mb-0">
              <Pagination.First disabled={currentPage === 1} onClick={() => setPage(1)} />
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
              <Pagination.Last disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} />
            </Pagination>
            <Form.Select
              size="sm"
              style={{ width: 100 }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Form.Select>
          </div>
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
    </RoleAwareLayout>
  );
}
