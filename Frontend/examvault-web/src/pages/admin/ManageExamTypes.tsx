import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Dropdown, Form, InputGroup, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteExamTypeButton from '../../components/DeleteExamTypeButton';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { EditIcon } from '../../components/icons/ActionIcons';
import { useExamTypes } from '../../hooks/useExams';
import { createExamType, updateExamType } from '../../api/examApi';
import type { ExamTypeOption } from '../../types/exam';

function extractError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3a2 2 0 0 1-2 4M7 5H4a2 2 0 0 0 2 4" />
    </svg>
  );
}

function PersonArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6M22 11l-3 3-3-3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="7" x2="9" y2="7" /><line x1="15" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="9" y2="11" /><line x1="15" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="9" y2="15" /><line x1="15" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <line x1="7" y1="7" x2="7" y2="7" />
    </svg>
  );
}

// Cosmetic per-row icon based on a keyword match against the tenant's
// current exam-type name - deterministic, not stored anywhere. Falls back
// to a generic tag for any custom name that doesn't match one of the
// common defaults.
function iconForExamType(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('assessment')) return <ClipboardIcon />;
  if (lower.includes('certif')) return <AwardIcon />;
  if (lower.includes('competit')) return <TrophyIcon />;
  if (lower.includes('entrance')) return <PersonArrowIcon />;
  if (lower.includes('internal')) return <BuildingIcon />;
  if (lower.includes('mock')) return <GraduationCapIcon />;
  if (lower.includes('practice')) return <BookOpenIcon />;
  if (lower.includes('recruit')) return <BriefcaseIcon />;
  return <TagIcon />;
}

type PurposeFilter = 'all' | 'with' | 'without';
type SortDir = 'asc' | 'desc';

export default function ManageExamTypes() {
  const { data: examTypes, isLoading, isError } = useExamTypes();
  const [searchText, setSearchText] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createExamType({ name, purpose: purpose.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateExamType(editingId!, { name, purpose: purpose.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      setShowModal(false);
    },
  });

  const activeMutation = editingId ? updateMutation : createMutation;

  const openCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    setEditingId(null);
    setName('');
    setPurpose('');
    setShowModal(true);
  };

  const openEdit = (examType: ExamTypeOption) => {
    createMutation.reset();
    updateMutation.reset();
    setEditingId(examType.id);
    setName(examType.name);
    setPurpose(examType.purpose ?? '');
    setShowModal(true);
  };

  const totalExamTypes = examTypes?.length ?? 0;
  const withPurposeCount = examTypes?.filter((t) => t.purpose).length ?? 0;
  const withoutPurposeCount = totalExamTypes - withPurposeCount;

  const filteredExamTypes = (examTypes ?? [])
    .filter((type) => type.name.toLowerCase().includes(searchText.trim().toLowerCase()))
    .filter((type) => {
      if (purposeFilter === 'with') return !!type.purpose;
      if (purposeFilter === 'without') return !type.purpose;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });

  useEffect(() => {
    setPage(1);
  }, [searchText, purposeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredExamTypes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedExamTypes = filteredExamTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredExamTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredExamTypes.length);

  return (
    <AdminLayout active="Exam Types">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: '#eef2ff', color: '#4f46e5' }}
          >
            <ShieldIcon />
          </div>
          <div>
            <p className="text-muted small mb-1">Exams / Exam Types</p>
            <h1 className="h4 fw-bold mb-1 text-primary">Exam Types</h1>
            <p className="text-muted mb-0">
              Purpose-based exam classification (Practice, Mock, Certification, etc.) - add or remove the
              options available when creating an exam.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Add Exam Type
        </Button>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Exam Type' : 'Add Exam Type'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeMutation.isError && <Alert variant="danger">{extractError(activeMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="examTypeName">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Practice Exam" />
          </Form.Group>
          <Form.Group controlId="examTypePurpose">
            <Form.Label>Purpose (optional)</Form.Label>
            <Form.Control
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Student practice, usually unlimited/repeated attempts"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || activeMutation.isPending}
            onClick={() => activeMutation.mutate()}
          >
            {activeMutation.isPending ? (editingId ? 'Saving...' : 'Adding...') : editingId ? 'Save' : 'Add'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="g-3 mt-1">
        <Col xs={12} md={4}>
          <ReportStatCard
            icon={<ShieldIcon />}
            label="Total Exam Types"
            value={String(totalExamTypes)}
            caption="Active exam types"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col xs={6} md={4}>
          <ReportStatCard
            icon={<ClipboardIcon />}
            label="With Purpose"
            value={String(withPurposeCount)}
            caption="Have a description"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col xs={6} md={4}>
          <ReportStatCard
            icon={<TagIcon />}
            label="Without Purpose"
            value={String(withoutPurposeCount)}
            caption="No description yet"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      <Row className="g-2 mb-3 mt-1">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search exam types..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md="auto" className="ms-auto">
          <Dropdown>
            <Dropdown.Toggle
              as="button"
              bsPrefix="btn"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            >
              <FilterIcon /> Filters
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item active={purposeFilter === 'all'} onClick={() => setPurposeFilter('all')}>
                All
              </Dropdown.Item>
              <Dropdown.Item active={purposeFilter === 'with'} onClick={() => setPurposeFilter('with')}>
                With Purpose
              </Dropdown.Item>
              <Dropdown.Item active={purposeFilter === 'without'} onClick={() => setPurposeFilter('without')}>
                Without Purpose
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || pagedExamTypes.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load exam types. Please try again.</div>
          )}

          {!isLoading && !isError && examTypes?.length === 0 && (
            <div className="text-center text-muted py-5">
              No exam types yet. Click "+ Add Exam Type" to create one.
            </div>
          )}

          {!isLoading && !isError && examTypes && examTypes.length > 0 && filteredExamTypes.length === 0 && (
            <div className="text-center text-muted py-5">No exam types match your search/filter.</div>
          )}

          {!isLoading && !isError && pagedExamTypes.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Name</th>
                  <th>Purpose</th>
                  <th
                    role="button"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="user-select-none"
                  >
                    Created On {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedExamTypes.map((examType) => (
                  <tr key={examType.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                          style={{ width: 32, height: 32, background: '#eef2ff', color: '#4f46e5' }}
                        >
                          {iconForExamType(examType.name)}
                        </div>
                        <span className="fw-medium">{examType.name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{examType.purpose || '-'}</td>
                    <td>{new Date(examType.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Edit"
                          aria-label={`Edit ${examType.name}`}
                          onClick={() => openEdit(examType)}
                        >
                          <EditIcon />
                        </Button>
                        <DeleteExamTypeButton examTypeId={examType.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredExamTypes.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredExamTypes.length} exam types
          </div>
          <div className="d-flex align-items-center gap-3">
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
    </AdminLayout>
  );
}
