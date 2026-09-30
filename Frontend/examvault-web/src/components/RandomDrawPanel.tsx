import { useState } from 'react';
import { Alert, Badge, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useAddRandomBankQuestionsToExam, useBankSubjects, useBankTopics, useRandomDrawPreview } from '../hooks/useQuestionBank';
import { extractServerError } from '../utils/apiError';
import {
  BANK_DIFFICULTIES,
  BANK_QUESTION_TYPES,
  type BankQuestionDifficulty,
  type BankQuestionType,
  type RandomDrawRule,
} from '../types/questionBank';

const MAX_RULES = 10;
const MAX_TOTAL = 100;

interface RuleRow {
  key: number;
  subjectId: string;
  topicId: string;
  questionType: BankQuestionType | '';
  difficulty: BankQuestionDifficulty | '';
  count: number;
}

let nextKey = 0;
const newRule = (): RuleRow => ({ key: nextKey++, subjectId: '', topicId: '', questionType: '', difficulty: '', count: 5 });

interface RandomDrawPanelProps {
  examId: string;
  sectionId?: string;
  // Ids of the newly created exam questions, so the caller can pre-select them.
  onAdded: (createdQuestionIds: string[]) => void;
  onDone: () => void;
}

// "Give me N random Active questions like this" - one or more rules. The draw
// is resolved immediately into fixed copies in the exam (it does not re-draw
// for each student), and combines freely with hand-picked questions.
export default function RandomDrawPanel({ examId, sectionId, onAdded, onDone }: RandomDrawPanelProps) {
  const { data: subjects = [] } = useBankSubjects();
  const { data: allTopics = [] } = useBankTopics();
  const [rows, setRows] = useState<RuleRow[]>([newRule()]);
  const addMutation = useAddRandomBankQuestionsToExam();

  const rules: RandomDrawRule[] = rows.map((r) => ({
    subjectId: r.subjectId,
    topicId: r.topicId || null,
    questionType: r.questionType || null,
    difficulty: r.difficulty || null,
    count: Number.isInteger(r.count) ? r.count : 0,
  }));
  const { data: availability, isFetching } = useRandomDrawPreview(examId, rules);

  const total = rows.reduce((sum, r) => sum + (Number.isInteger(r.count) && r.count > 0 ? r.count : 0), 0);
  const complete = rows.every((r) => r.subjectId && Number.isInteger(r.count) && r.count >= 1);
  const short = availability?.some((a) => a.available < a.requested) ?? false;
  const overLimit = total > MAX_TOTAL;

  const update = (key: number, patch: Partial<RuleRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const draw = async () => {
    try {
      const result = await addMutation.mutateAsync({ examId, sectionId, rules });
      if (result.added > 0) {
        onAdded(result.createdQuestionIds);
        onDone();
      }
    } catch {
      // Shown below via addMutation.error.
    }
  };

  return (
    <div>
      {addMutation.isError && <Alert variant="danger">{extractServerError(addMutation.error)}</Alert>}
      <p className="text-muted small">
        Each rule draws random <strong>Active</strong> questions from the bank that are not already in this exam. The questions are
        copied into the exam now and stay fixed - every student gets the same paper.
      </p>

      {rows.map((row, index) => {
        const topics = allTopics.filter((t) => t.subjectId === row.subjectId);
        const info = availability?.[index];
        return (
          <div key={row.key} className="border rounded-3 p-3 mb-2">
            <Row className="g-2 align-items-end">
              <Col lg={3} md={6}>
                <Form.Label className="small fw-bold mb-1">Subject *</Form.Label>
                <Form.Select
                  aria-label={`Rule ${index + 1} subject`}
                  value={row.subjectId}
                  onChange={(e) => update(row.key, { subjectId: e.target.value, topicId: '' })}
                >
                  <option value="">Select...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col lg={2} md={6}>
                <Form.Label className="small fw-bold mb-1">Topic</Form.Label>
                <Form.Select
                  aria-label={`Rule ${index + 1} topic`}
                  value={row.topicId}
                  disabled={!row.subjectId}
                  onChange={(e) => update(row.key, { topicId: e.target.value })}
                >
                  <option value="">Any</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col lg={2} md={4}>
                <Form.Label className="small fw-bold mb-1">Type</Form.Label>
                <Form.Select
                  aria-label={`Rule ${index + 1} type`}
                  value={row.questionType}
                  onChange={(e) => update(row.key, { questionType: e.target.value as BankQuestionType | '' })}
                >
                  <option value="">Any</option>
                  {BANK_QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col lg={2} md={4}>
                <Form.Label className="small fw-bold mb-1">Difficulty</Form.Label>
                <Form.Select
                  aria-label={`Rule ${index + 1} difficulty`}
                  value={row.difficulty}
                  onChange={(e) => update(row.key, { difficulty: e.target.value as BankQuestionDifficulty | '' })}
                >
                  <option value="">Any</option>
                  {BANK_DIFFICULTIES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col lg={1} md={2}>
                <Form.Label className="small fw-bold mb-1">How many</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={MAX_TOTAL}
                  aria-label={`Rule ${index + 1} count`}
                  value={Number.isNaN(row.count) ? '' : row.count}
                  onChange={(e) => update(row.key, { count: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                />
              </Col>
              <Col lg={2} md={2} className="d-flex align-items-center gap-2">
                {rows.length > 1 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    aria-label={`Remove rule ${index + 1}`}
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  >
                    ×
                  </Button>
                )}
                {info && (
                  <Badge bg={info.available >= info.requested ? 'success' : 'danger'}>
                    {info.available} available
                  </Badge>
                )}
              </Col>
            </Row>
          </div>
        );
      })}

      <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" size="sm" disabled={rows.length >= MAX_RULES} onClick={() => setRows((prev) => [...prev, newRule()])}>
            + Add rule
          </Button>
          <span className="text-muted small">
            {total} question(s) total {isFetching && <Spinner animation="border" size="sm" className="ms-1" />}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {short && <span className="text-danger small">Not enough matching questions for a rule - lower its count.</span>}
          {overLimit && <span className="text-danger small">At most {MAX_TOTAL} questions per draw.</span>}
          <Button variant="primary" disabled={!complete || short || overLimit || addMutation.isPending} onClick={draw}>
            {addMutation.isPending ? 'Drawing...' : `Draw & Add ${total || ''} to Exam`.replace('  ', ' ')}
          </Button>
        </div>
      </div>
    </div>
  );
}
