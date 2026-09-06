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
import { ClipboardIcon, TagIcon, iconForExamType } from '../../utils/examTypeIcons';
import { getPaginationRange } from '../../utils/paginationRange';
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
  // Blank = "use the platform's Exam Defaults" (Settings > Exam Defaults) -
  // these are per-type overrides, not required fields. Kept as strings/
  // tri-state so an empty Form.Control can represent "unset" distinctly
  // from a real 0.
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState('');
  const [passingScorePercent, setPassingScorePercent] = useState('');
  const [defaultMaxAttempts, setDefaultMaxAttempts] = useState('');
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState<'' | 'true' | 'false'>('');
  const [negativeMarkingValue, setNegativeMarkingValue] = useState('');
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const queryClient = useQueryClient();

  const numberOrNull = (text: string) => (text.trim() === '' ? null : Number(text));
  const boolOrNull = (tri: '' | 'true' | 'false') => (tri === '' ? null : tri === 'true');

  const buildDefaultsPayload = () => ({
    defaultDurationMinutes: numberOrNull(defaultDurationMinutes),
    passingScorePercent: numberOrNull(passingScorePercent),
    defaultMaxAttempts: numberOrNull(defaultMaxAttempts),
    negativeMarkingEnabled: boolOrNull(negativeMarkingEnabled),
    negativeMarkingValue: numberOrNull(negativeMarkingValue),
    autoSubmitEnabled: boolOrNull(autoSubmitEnabled),
  });

  const createMutation = useMutation({
    mutationFn: () => createExamType({ name, purpose: purpose.trim() || null, ...buildDefaultsPayload() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateExamType(editingId!, { name, purpose: purpose.trim() || null, ...buildDefaultsPayload() }),
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
    setDefaultDurationMinutes('');
    setPassingScorePercent('');
    setDefaultMaxAttempts('');
    setNegativeMarkingEnabled('');
    setNegativeMarkingValue('');
    setAutoSubmitEnabled('');
    setShowModal(true);
  };

  const openEdit = (examType: ExamTypeOption) => {
    createMutation.reset();
    updateMutation.reset();
    setEditingId(examType.id);
    setName(examType.name);
    setPurpose(examType.purpose ?? '');
    setDefaultDurationMinutes(examType.defaultDurationMinutes?.toString() ?? '');
    setPassingScorePercent(examType.passingScorePercent?.toString() ?? '');
    setDefaultMaxAttempts(examType.defaultMaxAttempts?.toString() ?? '');
    setNegativeMarkingEnabled(
      examType.negativeMarkingEnabled === null || examType.negativeMarkingEnabled === undefined
        ? ''
        : examType.negativeMarkingEnabled
          ? 'true'
          : 'false',
    );
    setNegativeMarkingValue(examType.negativeMarkingValue?.toString() ?? '');
    setAutoSubmitEnabled(
      examType.autoSubmitEnabled === null || examType.autoSubmitEnabled === undefined
        ? ''
        : examType.autoSubmitEnabled
          ? 'true'
          : 'false',
    );
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
          <Form.Group className="mb-3" controlId="examTypePurpose">
            <Form.Label>Purpose (optional)</Form.Label>
            <Form.Control
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Student practice, usually unlimited/repeated attempts"
            />
          </Form.Group>

          <hr />
          <div className="fw-bold small mb-1">Recommended Defaults (optional)</div>
          <p className="text-muted small mb-3">
            Pre-fills a new exam of this type. Leave any field blank to use the platform's own Exam Defaults
            (Settings &gt; Exam Defaults) instead.
          </p>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypeDuration">
                <Form.Label className="small">Default Duration (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  placeholder="Use platform default"
                  value={defaultDurationMinutes}
                  onChange={(e) => setDefaultDurationMinutes(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypePassingScore">
                <Form.Label className="small">Passing Score (%)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Use platform default"
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypeMaxAttempts">
                <Form.Label className="small">Max Attempts</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  placeholder="Use platform default"
                  value={defaultMaxAttempts}
                  onChange={(e) => setDefaultMaxAttempts(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypeAutoSubmit">
                <Form.Label className="small">Auto Submit</Form.Label>
                <Form.Select value={autoSubmitEnabled} onChange={(e) => setAutoSubmitEnabled(e.target.value as '' | 'true' | 'false')}>
                  <option value="">Use platform default</option>
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypeNegativeMarking">
                <Form.Label className="small">Negative Marking</Form.Label>
                <Form.Select
                  value={negativeMarkingEnabled}
                  onChange={(e) => setNegativeMarkingEnabled(e.target.value as '' | 'true' | 'false')}
                >
                  <option value="">Use platform default</option>
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="examTypeNegativeMarkingValue">
                <Form.Label className="small">Negative Marking Value</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step={0.25}
                  placeholder="Use platform default"
                  value={negativeMarkingValue}
                  onChange={(e) => setNegativeMarkingValue(e.target.value)}
                  disabled={negativeMarkingEnabled === 'false'}
                />
              </Form.Group>
            </Col>
          </Row>
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
              <thead className="text-muted small text-uppercase bg-body-tertiary">
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
              <Pagination.First disabled={currentPage === 1} onClick={() => setPage(1)} />
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
              {getPaginationRange(currentPage, totalPages).map((p, i) =>
                p === 'ellipsis' ? (
                  <Pagination.Ellipsis key={`ellipsis-${i}`} disabled />
                ) : (
                  <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                    {p}
                  </Pagination.Item>
                ),
              )}
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
    </AdminLayout>
  );
}
