import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import TablePagination from '../../components/reports/TablePagination';
import QuestionBankFormModal from '../../components/QuestionBankFormModal';
import BankImportModal from '../../components/BankImportModal';
import { Link } from 'react-router-dom';
import { CopyIcon, EditIcon, TrashIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useBankQuestions,
  useBankSubjects,
  useBankTags,
  useBankTopics,
  useBulkSetBankStatus,
  useDeleteBankQuestion,
  useDuplicateBankQuestion,
} from '../../hooks/useQuestionBank';
import { extractServerError } from '../../utils/apiError';
import {
  BANK_DIFFICULTIES,
  BANK_QUESTION_TYPES,
  BANK_STATUSES,
  type BankQuestion,
  type BankQuestionDifficulty,
  type BankQuestionStatus,
  type BankQuestionType,
} from '../../types/questionBank';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TYPE_LABEL = Object.fromEntries(BANK_QUESTION_TYPES.map((t) => [t.value, t.label]));
const DIFFICULTY_VARIANT: Record<BankQuestionDifficulty, string> = { Easy: 'success', Medium: 'warning', Hard: 'danger' };
const STATUS_VARIANT: Record<BankQuestionStatus, string> = { Draft: 'secondary', Active: 'success', Archived: 'warning' };

function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface QuestionBankProps {
  // "My Questions" - same page narrowed to the caller's own questions. A
  // convenience filter only; the server enforces who may edit what.
  mine?: boolean;
}

export default function QuestionBank({ mine = false }: QuestionBankProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin = user?.role !== 'Instructor';
  const canCreate = isAdmin || hasPermission('Questions - Create');
  const canEditAny = isAdmin || hasPermission('Questions - Edit');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionType, setQuestionType] = useState<BankQuestionType | ''>('');
  const [difficulty, setDifficulty] = useState<BankQuestionDifficulty | ''>('');
  const [status, setStatus] = useState<BankQuestionStatus | ''>('');
  const [tagId, setTagId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formQuestion, setFormQuestion] = useState<BankQuestion | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<BankQuestion | null>(null);
  const [deleting, setDeleting] = useState<BankQuestion | null>(null);

  const { data: subjects = [] } = useBankSubjects();
  const { data: topics = [] } = useBankTopics(subjectId || undefined);
  const { data: tags = [] } = useBankTags();
  const deleteMutation = useDeleteBankQuestion();
  const duplicateMutation = useDuplicateBankQuestion();
  const bulkStatusMutation = useBulkSetBankStatus();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ variant: 'success' | 'warning' | 'danger'; text: string } | null>(null);

  // Any filter change goes back to page 1 (page N of the old result set
  // may not exist under the new one).
  useEffect(() => {
    setPage(1);
  }, [search, subjectId, topicId, questionType, difficulty, status, tagId, pageSize, mine]);

  // A selection only makes sense for the rows currently on screen.
  useEffect(() => {
    setSelected(new Set());
  }, [page, search, subjectId, topicId, questionType, difficulty, status, tagId, pageSize, mine]);

  const { data, isLoading, isError, isFetching } = useBankQuestions({
    search,
    subjectId: subjectId || undefined,
    topicId: topicId || undefined,
    questionType: questionType || undefined,
    difficulty: difficulty || undefined,
    status: status || undefined,
    tagId: tagId || undefined,
    mine: mine || undefined,
    page,
    pageSize,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canEdit = (q: BankQuestion) => canEditAny && (isAdmin || q.createdByUserId === user?.id);
  const hasFilters = Boolean(searchInput || subjectId || topicId || questionType || difficulty || status || tagId);

  const clearFilters = () => {
    setSearchInput('');
    setSubjectId('');
    setTopicId('');
    setQuestionType('');
    setDifficulty('');
    setStatus('');
    setTagId('');
  };

  const openCreate = () => {
    setFormQuestion(undefined);
    setShowForm(true);
  };

  const openEdit = (q: BankQuestion) => {
    setFormQuestion(q);
    setShowForm(true);
  };

  // Only rows the caller may change can be bulk-selected (the server re-checks
  // ownership per item regardless).
  const selectable = items.filter(canEdit);
  const allSelected = selectable.length > 0 && selectable.every((q) => selected.has(q.id));

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((q) => q.id)));

  const applyBulkStatus = async (newStatus: BankQuestionStatus) => {
    setNotice(null);
    try {
      const result = await bulkStatusMutation.mutateAsync({ ids: [...selected], status: newStatus });
      setSelected(new Set());
      setNotice(
        result.skipped.length > 0
          ? { variant: 'warning', text: `${result.updated} question(s) set to ${newStatus}; ${result.skipped.length} skipped (${[...new Set(result.skipped.map((s) => s.reason))].join(' ')})` }
          : { variant: 'success', text: `${result.updated} question(s) set to ${newStatus}.` },
      );
    } catch (error) {
      setNotice({ variant: 'danger', text: extractServerError(error) });
    }
  };

  // The copy is a Draft owned by the caller; open it straight away so its
  // wording can be adjusted before it is activated.
  const duplicate = async (q: BankQuestion) => {
    setNotice(null);
    try {
      const copy = await duplicateMutation.mutateAsync(q.id);
      setNotice({ variant: 'success', text: 'Copy created as a Draft - adjust it below, then set it to Active when ready.' });
      openEdit(copy);
    } catch (error) {
      setNotice({ variant: 'danger', text: extractServerError(error) });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      // Shown in the modal via deleteMutation.error.
    }
  };

  return (
    <RoleAwareLayout active={mine ? 'My Questions' : 'All Questions'}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Question Bank / {mine ? 'My Questions' : 'All Questions'}</p>
          <h1 className="h4 fw-bold mb-0 text-primary">{mine ? 'My Questions' : 'Question Bank'}</h1>
        </div>
        {canCreate && (
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/admin/question-bank/ai-generate" className="btn btn-outline-primary">
              AI Generate
            </Link>
            <Button variant="outline-primary" onClick={() => setShowImport(true)}>
              Import
            </Button>
            <Button variant="primary" onClick={openCreate}>
              + Add Question
            </Button>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col lg={4} md={12}>
              <InputGroup>
                <Form.Control
                  type="search"
                  placeholder="Search question text..."
                  aria-label="Search questions"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col lg={4} md={6}>
              <Form.Select
                aria-label="Filter by subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                }}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={4} md={6}>
              <Form.Select aria-label="Filter by topic" value={topicId} disabled={!subjectId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">{subjectId ? 'All topics' : 'Select a subject first'}</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={3} md={6}>
              <Form.Select aria-label="Filter by type" value={questionType} onChange={(e) => setQuestionType(e.target.value as BankQuestionType | '')}>
                <option value="">All types</option>
                {BANK_QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={3} md={6}>
              <Form.Select aria-label="Filter by difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as BankQuestionDifficulty | '')}>
                <option value="">All difficulties</option>
                {BANK_DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={2} md={6}>
              <Form.Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as BankQuestionStatus | '')}>
                <option value="">All statuses</option>
                {BANK_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={3} md={6}>
              <Form.Select aria-label="Filter by tag" value={tagId} onChange={(e) => setTagId(e.target.value)}>
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={1} md={12} className="d-flex">
              <Button variant="outline-secondary" className="w-100" disabled={!hasFilters} onClick={clearFilters}>
                Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {notice && (
        <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      {selected.size > 0 && (
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body className="d-flex align-items-center gap-2 flex-wrap py-2">
            <span className="fw-medium me-2">{selected.size} selected</span>
            <Button size="sm" variant="outline-warning" disabled={bulkStatusMutation.isPending} onClick={() => applyBulkStatus('Archived')}>
              Archive
            </Button>
            <Button size="sm" variant="outline-success" disabled={bulkStatusMutation.isPending} onClick={() => applyBulkStatus('Active')}>
              Set Active
            </Button>
            <Button size="sm" variant="outline-secondary" disabled={bulkStatusMutation.isPending} onClick={() => applyBulkStatus('Draft')}>
              Move to Draft
            </Button>
            <Button size="sm" variant="link" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
          </Card.Body>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || items.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}
          {isError && <div className="text-center text-danger py-5">Couldn't load the question bank. Please try again.</div>}
          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">
              {hasFilters
                ? 'No questions match these filters.'
                : mine
                  ? "You haven't added any questions yet."
                  : subjects.length === 0
                    ? 'The bank is empty. Start by creating a subject under Subjects & Topics, then add questions.'
                    : 'The bank is empty. Click "+ Add Question" to add the first one.'}
            </div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle" style={{ opacity: isFetching ? 0.6 : 1 }}>
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4" style={{ width: 40 }}>
                    <Form.Check
                      aria-label="Select all questions on this page"
                      checked={allSelected}
                      disabled={selectable.length === 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Question</th>
                  <th>Subject / Topic</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th title="Exam questions copied from this bank question">Used In</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className={selected.has(q.id) ? 'table-active' : undefined}>
                    <td className="ps-4">
                      <Form.Check
                        aria-label={`Select ${q.questionText}`}
                        checked={selected.has(q.id)}
                        disabled={!canEdit(q)}
                        onChange={() => toggleSelected(q.id)}
                      />
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      <div className="text-truncate fw-medium" title={q.questionText}>
                        {q.questionText}
                      </div>
                      {q.tags.length > 0 && (
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {q.tags.map((t) => (
                            <Badge key={t.id} bg="light" text="dark" className="border">
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{q.subjectName}</div>
                      {q.topicName && <div className="text-muted small">{q.topicName}</div>}
                    </td>
                    <td>{TYPE_LABEL[q.questionType]}</td>
                    <td>
                      <Badge bg={DIFFICULTY_VARIANT[q.difficulty]}>{q.difficulty}</Badge>
                    </td>
                    <td>
                      {q.defaultMarks}
                      {q.negativeMarks > 0 && <span className="text-danger small"> (-{q.negativeMarks})</span>}
                    </td>
                    <td>
                      {q.usageCount > 0 ? `${q.usageCount} exam question(s)` : <span className="text-muted">-</span>}
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANT[q.status]}>{q.status}</Badge>
                    </td>
                    <td>{q.createdByName ?? '-'}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="View"
                          aria-label="View question"
                          onClick={() => setViewing(q)}
                        >
                          <ViewIcon />
                        </Button>
                        {canCreate && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Duplicate as a new Draft"
                            aria-label="Duplicate question"
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicate(q)}
                          >
                            <CopyIcon />
                          </Button>
                        )}
                        {canEdit(q) && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Edit"
                            aria-label="Edit question"
                            onClick={() => openEdit(q)}
                          >
                            <EditIcon />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Delete"
                            aria-label="Delete question"
                            onClick={() => {
                              deleteMutation.reset();
                              setDeleting(q);
                            }}
                          >
                            <TrashIcon />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <TablePagination
        page={page}
        totalPages={totalPages}
        rangeStart={total === 0 ? 0 : (page - 1) * pageSize + 1}
        rangeEnd={Math.min(page * pageSize, total)}
        totalCount={total}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
      />

      <BankImportModal show={showImport} onHide={() => setShowImport(false)} defaultSubjectId={subjectId || undefined} />

      <QuestionBankFormModal
        show={showForm}
        onHide={() => setShowForm(false)}
        question={formQuestion}
        defaultSubjectId={subjectId || undefined}
      />

      <Modal show={viewing !== null} onHide={() => setViewing(null)} size="lg" centered scrollable>
        {viewing && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Question Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Badge bg="primary">{viewing.subjectName}</Badge>
                {viewing.topicName && <Badge bg="info">{viewing.topicName}</Badge>}
                <Badge bg="secondary">{TYPE_LABEL[viewing.questionType]}</Badge>
                <Badge bg={DIFFICULTY_VARIANT[viewing.difficulty]}>{viewing.difficulty}</Badge>
                <Badge bg={STATUS_VARIANT[viewing.status]}>{viewing.status}</Badge>
                <Badge bg="light" text="dark" className="border">
                  {viewing.defaultMarks} mark(s){viewing.negativeMarks > 0 ? `, -${viewing.negativeMarks} negative` : ''}
                </Badge>
              </div>
              <p className="fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                {viewing.questionText}
              </p>
              {viewing.questionType === 'CodeProgram' && (
                <div className="mb-3 small">
                  <div>
                    <strong>Language:</strong> {viewing.programmingLanguage ?? '-'}
                    {viewing.allowLanguageChange && ' (student may switch)'}
                  </div>
                  {viewing.functionName && (
                    <div>
                      <strong>Function:</strong>{' '}
                      <code>
                        {viewing.functionName}({(viewing.parameters ?? []).map((p) => `${p.name}: ${p.type}`).join(', ')}) → {viewing.returnType}
                      </code>
                    </div>
                  )}
                  <div>
                    <strong>Auto-graded test cases:</strong> {(viewing.testCases?.length ?? 0) + (viewing.sqlTestCases?.length ?? 0)}
                  </div>
                  {viewing.starterCode && (
                    <pre className="border rounded p-2 mt-2 mb-0">{viewing.starterCode}</pre>
                  )}
                </div>
              )}
              <ul className="list-unstyled">
                {viewing.options.map((o) => (
                  <li key={o.id} className={o.isCorrect ? 'text-success fw-medium' : ''}>
                    {o.isCorrect ? '✓ ' : '○ '}
                    {o.optionText}
                  </li>
                ))}
              </ul>
              {viewing.explanation && (
                <Alert variant="light" className="border">
                  <strong>Explanation:</strong> {viewing.explanation}
                </Alert>
              )}
              {viewing.tags.length > 0 && (
                <div className="d-flex flex-wrap gap-1">
                  {viewing.tags.map((t) => (
                    <Badge key={t.id} bg="light" text="dark" className="border">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-muted small mt-3 mb-0">
                Added by {viewing.createdByName ?? 'unknown'} on {new Date(viewing.createdAtUtc).toLocaleDateString()}
                {viewing.updatedAtUtc && ` · last edited ${new Date(viewing.updatedAtUtc).toLocaleDateString()}`}
              </p>
            </Modal.Body>
          </>
        )}
      </Modal>

      <Modal show={deleting !== null} onHide={() => setDeleting(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteMutation.isError && <Alert variant="danger">{extractServerError(deleteMutation.error)}</Alert>}
          Delete this question from the bank? Exams that already use a copy of it are not affected. This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </RoleAwareLayout>
  );
}
