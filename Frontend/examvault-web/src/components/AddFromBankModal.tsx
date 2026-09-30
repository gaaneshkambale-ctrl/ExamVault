import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Nav, Row, Spinner, Table } from 'react-bootstrap';
import RandomDrawPanel from './RandomDrawPanel';
import TablePagination from './reports/TablePagination';
import { useAddBankQuestionsToExam, useBankQuestions, useBankSubjects, useBankTopics } from '../hooks/useQuestionBank';
import { extractServerError } from '../utils/apiError';
import {
  BANK_DIFFICULTIES,
  BANK_QUESTION_TYPES,
  type BankQuestionDifficulty,
  type BankQuestionType,
} from '../types/questionBank';

const PAGE_SIZE = 10;
const TYPE_LABEL = Object.fromEntries(BANK_QUESTION_TYPES.map((t) => [t.value, t.label]));

interface AddFromBankModalProps {
  show: boolean;
  examId: string;
  // Present: copies land directly in this section. Absent: they land in the
  // exam's unassigned pool (what SectionForm's "Available Questions" lists).
  sectionId?: string;
  onHide: () => void;
  // Ids of the newly created exam questions, so the caller can pre-select them.
  onAdded: (createdQuestionIds: string[]) => void;
}

// Pick reusable questions from the organization's Question Bank and copy them
// into this exam. Only Active questions are offered; ones already in this exam
// are shown but can't be picked again.
export default function AddFromBankModal({ show, examId, sectionId, onHide, onAdded }: AddFromBankModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState<BankQuestionDifficulty | ''>('');
  const [questionType, setQuestionType] = useState<BankQuestionType | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [skippedNote, setSkippedNote] = useState<string | null>(null);
  const [tab, setTab] = useState<'pick' | 'random'>('pick');

  const { data: subjects = [] } = useBankSubjects();
  const { data: topics = [] } = useBankTopics(subjectId || undefined);
  const addMutation = useAddBankQuestionsToExam();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, subjectId, topicId, difficulty, questionType]);

  // Fresh picker every time it opens.
  useEffect(() => {
    if (show) {
      setSearchInput('');
      setSearch('');
      setSubjectId('');
      setTopicId('');
      setDifficulty('');
      setQuestionType('');
      setPage(1);
      setSelected(new Set());
      setTab('pick');
      setSkippedNote(null);
      addMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const { data, isLoading, isError, isFetching } = useBankQuestions({
    search,
    subjectId: subjectId || undefined,
    topicId: topicId || undefined,
    questionType: questionType || undefined,
    difficulty: difficulty || undefined,
    status: 'Active',
    examId,
    page,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pickable = items.filter((q) => !q.inExam);
  const allPageSelected = pickable.length > 0 && pickable.every((q) => selected.has(q.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pickable.forEach((q) => (allPageSelected ? next.delete(q.id) : next.add(q.id)));
      return next;
    });

  const submit = async () => {
    setSkippedNote(null);
    try {
      const result = await addMutation.mutateAsync({ examId, sectionId, bankQuestionIds: [...selected] });
      if (result.skipped.length > 0) {
        setSkippedNote(`${result.skipped.length} question(s) were skipped: ${[...new Set(result.skipped.map((s) => s.reason))].join(' ')}`);
      }
      if (result.added > 0) {
        onAdded(result.createdQuestionIds);
        onHide();
      }
    } catch {
      // Shown below via addMutation.error.
    }
  };

  return (
    <Modal show={show} onHide={addMutation.isPending ? undefined : onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Add Questions from Question Bank</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Nav variant="tabs" activeKey={tab} onSelect={(key) => setTab((key as 'pick' | 'random') ?? 'pick')} className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="pick">Pick questions</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="random">Random draw</Nav.Link>
          </Nav.Item>
        </Nav>

        {tab === 'random' ? (
          <RandomDrawPanel examId={examId} sectionId={sectionId} onAdded={onAdded} onDone={onHide} />
        ) : (
          <>
        {addMutation.isError && <Alert variant="danger">{extractServerError(addMutation.error)}</Alert>}
        {skippedNote && <Alert variant="warning">{skippedNote}</Alert>}

        <Row className="g-2 mb-3">
          <Col lg={4}>
            <Form.Control
              type="search"
              placeholder="Search question text..."
              aria-label="Search bank questions"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Col>
          <Col lg={2} md={6}>
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
          <Col lg={2} md={6}>
            <Form.Select aria-label="Filter by topic" value={topicId} disabled={!subjectId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">{subjectId ? 'All topics' : 'Pick subject first'}</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col lg={2} md={6}>
            <Form.Select aria-label="Filter by type" value={questionType} onChange={(e) => setQuestionType(e.target.value as BankQuestionType | '')}>
              <option value="">All types</option>
              {BANK_QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col lg={2} md={6}>
            <Form.Select aria-label="Filter by difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as BankQuestionDifficulty | '')}>
              <option value="">All difficulties</option>
              {BANK_DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        {isLoading && (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" />
          </div>
        )}
        {isError && <div className="text-center text-danger py-5">Couldn't load the question bank. Please try again.</div>}
        {!isLoading && !isError && items.length === 0 && (
          <div className="text-center text-muted py-5">
            No Active bank questions match. Only Active questions can be added to an exam - set a question's status to Active in the Question Bank.
          </div>
        )}
        {!isLoading && !isError && items.length > 0 && (
          <Table responsive hover className="align-middle mb-0" style={{ opacity: isFetching ? 0.6 : 1 }}>
            <thead className="text-muted small text-uppercase">
              <tr>
                <th style={{ width: 40 }}>
                  <Form.Check aria-label="Select all on this page" checked={allPageSelected} disabled={pickable.length === 0} onChange={togglePage} />
                </th>
                <th>Question</th>
                <th>Subject / Topic</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className={q.inExam ? 'text-muted' : undefined}>
                  <td>
                    <Form.Check
                      aria-label={`Select ${q.questionText}`}
                      checked={selected.has(q.id)}
                      disabled={q.inExam}
                      onChange={() => toggle(q.id)}
                    />
                  </td>
                  <td style={{ maxWidth: 380 }}>
                    <div className="text-truncate fw-medium" title={q.questionText}>
                      {q.questionText}
                    </div>
                    {q.inExam && (
                      <Badge bg="secondary" className="mt-1">
                        Already in this exam
                      </Badge>
                    )}
                  </td>
                  <td>
                    <div>{q.subjectName}</div>
                    {q.topicName && <div className="text-muted small">{q.topicName}</div>}
                  </td>
                  <td>{TYPE_LABEL[q.questionType]}</td>
                  <td>{q.difficulty}</td>
                  <td>{q.defaultMarks}</td>
                  <td>{q.usageCount}x</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          rangeStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          rangeEnd={Math.min(page * PAGE_SIZE, total)}
          totalCount={total}
          onPageChange={setPage}
        />
          </>
        )}
      </Modal.Body>
      {tab === 'pick' && (
      <Modal.Footer className="justify-content-between">
        <span className="text-muted small">
          {selected.size} selected
          {selected.size > 0 && (
            <Button variant="link" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          )}
        </span>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={onHide} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={selected.size === 0 || addMutation.isPending}>
            {addMutation.isPending ? 'Adding...' : `Add ${selected.size || ''} to Exam`.replace('  ', ' ')}
          </Button>
        </div>
      </Modal.Footer>
      )}
    </Modal>
  );
}
