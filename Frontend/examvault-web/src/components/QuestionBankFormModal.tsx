import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useBankSubjects, useBankTags, useBankTopics, useCreateBankQuestion, useUpdateBankQuestion } from '../hooks/useQuestionBank';
import { extractServerError } from '../utils/apiError';
import BankCodeFields from './BankCodeFields';
import { codeFormFromQuestion, codeFormToRequestFields, emptyCodeForm, validateCodeForm } from '../utils/bankCode';
import type { CodeFormState } from '../utils/bankCode';
import {
  BANK_DIFFICULTIES,
  BANK_QUESTION_TYPES,
  BANK_STATUSES,
  type BankQuestion,
  type BankQuestionDifficulty,
  type BankQuestionStatus,
  type BankQuestionType,
  type SaveBankQuestionRequest,
} from '../types/questionBank';

interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

interface FormState {
  subjectId: string;
  topicId: string;
  questionType: BankQuestionType;
  questionText: string;
  explanation: string;
  difficulty: BankQuestionDifficulty;
  defaultMarks: string;
  negativeMarks: string;
  shuffleOptions: boolean;
  status: BankQuestionStatus;
  tagIds: string[];
  options: OptionDraft[];
  code: CodeFormState;
}

const TRUE_FALSE: OptionDraft[] = [
  { text: 'True', isCorrect: true },
  { text: 'False', isCorrect: false },
];

const blankOptions = (): OptionDraft[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

function emptyForm(subjectId = ''): FormState {
  return {
    subjectId,
    topicId: '',
    questionType: 'MultipleChoice',
    questionText: '',
    explanation: '',
    difficulty: 'Medium',
    defaultMarks: '1',
    negativeMarks: '0',
    shuffleOptions: false,
    status: 'Draft',
    tagIds: [],
    options: blankOptions(),
    code: emptyCodeForm(),
  };
}

function fromQuestion(q: BankQuestion): FormState {
  return {
    subjectId: q.subjectId,
    topicId: q.topicId ?? '',
    questionType: q.questionType,
    questionText: q.questionText,
    explanation: q.explanation ?? '',
    difficulty: q.difficulty,
    defaultMarks: String(q.defaultMarks),
    negativeMarks: String(q.negativeMarks),
    shuffleOptions: q.shuffleOptions,
    status: q.status,
    tagIds: q.tags.map((t) => t.id),
    options: q.options.map((o) => ({ text: o.optionText, isCorrect: o.isCorrect })),
    code: q.questionType === 'CodeProgram' ? codeFormFromQuestion(q) : emptyCodeForm(),
  };
}

// Mirrors SaveBankQuestionValidator on the server - the server stays the
// authority, this just avoids a round trip for the obvious mistakes.
function validate(form: FormState): string[] {
  const errors: string[] = [];
  if (!form.subjectId) errors.push('Subject is required.');
  if (!form.questionText.trim()) errors.push('Question text is required.');
  const marks = Number(form.defaultMarks);
  const negative = Number(form.negativeMarks);
  if (!Number.isInteger(marks) || marks <= 0) errors.push('Default marks must be a whole number above 0.');
  if (Number.isNaN(negative) || negative < 0 || negative > marks) errors.push('Negative marks must be between 0 and the default marks.');
  if (form.questionType === 'CodeProgram') {
    return [...errors, ...validateCodeForm(form.code)];
  }
  if (form.questionType !== 'TrueFalse') {
    if (form.options.length < 2) errors.push('At least two options are required.');
    if (form.options.some((o) => !o.text.trim())) errors.push('Every option needs text.');
  }
  const correct = form.options.filter((o) => o.isCorrect).length;
  if (form.questionType === 'MultiSelect' ? correct < 2 : correct !== 1) {
    errors.push(form.questionType === 'MultiSelect' ? 'Mark at least two options correct.' : 'Mark exactly one option correct.');
  }
  return errors;
}

interface QuestionBankFormModalProps {
  show: boolean;
  onHide: () => void;
  // Present = edit; absent = create.
  question?: BankQuestion;
  defaultSubjectId?: string;
}

export default function QuestionBankFormModal({ show, onHide, question, defaultSubjectId }: QuestionBankFormModalProps) {
  const { data: subjects = [] } = useBankSubjects();
  const { data: tags = [] } = useBankTags();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<string[]>([]);
  const { data: topics = [] } = useBankTopics(form.subjectId || undefined);
  const createMutation = useCreateBankQuestion();
  const updateMutation = useUpdateBankQuestion();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Reset whenever the modal opens (fresh create, or a different question).
  useEffect(() => {
    if (show) {
      setForm(question ? fromQuestion(question) : emptyForm(defaultSubjectId));
      setErrors([]);
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, question, defaultSubjectId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const changeType = (type: BankQuestionType) =>
    setForm((f) => ({
      ...f,
      questionType: type,
      options:
        type === 'CodeProgram'
          ? []
          : type === 'TrueFalse'
            ? TRUE_FALSE.map((o) => ({ ...o }))
            : f.questionType === 'TrueFalse' || f.questionType === 'CodeProgram'
              ? blankOptions()
              : f.options,
    }));

  const setCorrect = (index: number, checked: boolean) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) =>
        f.questionType === 'MultiSelect' ? (i === index ? { ...o, isCorrect: checked } : o) : { ...o, isCorrect: i === index },
      ),
    }));

  const submit = async () => {
    const problems = validate(form);
    setErrors(problems);
    if (problems.length > 0) return;

    const body: SaveBankQuestionRequest = {
      subjectId: form.subjectId,
      topicId: form.topicId || null,
      questionType: form.questionType,
      questionText: form.questionText.trim(),
      explanation: form.explanation.trim() || null,
      difficulty: form.difficulty,
      defaultMarks: Number(form.defaultMarks),
      negativeMarks: Number(form.negativeMarks),
      shuffleOptions: form.shuffleOptions && form.questionType !== 'CodeProgram',
      status: form.status,
      tagIds: form.tagIds,
      options: form.questionType === 'CodeProgram' ? [] : form.options.map((o) => ({ optionText: o.text.trim(), isCorrect: o.isCorrect })),
      ...(form.questionType === 'CodeProgram' ? codeFormToRequestFields(form.code) : {}),
    };

    try {
      if (question) {
        await updateMutation.mutateAsync({ id: question.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onHide();
    } catch {
      // Surfaced below via the mutation's error.
    }
  };

  const serverError = createMutation.error ?? updateMutation.error;
  const isTrueFalse = form.questionType === 'TrueFalse';
  const isCode = form.questionType === 'CodeProgram';

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{question ? 'Edit Bank Question' : 'Add Question to Bank'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {(errors.length > 0 || serverError) && (
          <Alert variant="danger">
            {errors.length > 0 ? (
              <ul className="mb-0 ps-3">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : (
              extractServerError(serverError)
            )}
          </Alert>
        )}

        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="qb-subject">
              <Form.Label>Subject *</Form.Label>
              <Form.Select
                value={form.subjectId}
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value, topicId: '' }))}
              >
                <option value="">Select subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Form.Select>
              {subjects.length === 0 && <Form.Text className="text-muted">Create a subject first (Subjects &amp; Topics).</Form.Text>}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="qb-topic">
              <Form.Label>Topic</Form.Label>
              <Form.Select value={form.topicId} onChange={(e) => set('topicId', e.target.value)} disabled={!form.subjectId}>
                <option value="">No topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group controlId="qb-type">
              <Form.Label>Question Type</Form.Label>
              <Form.Select value={form.questionType} onChange={(e) => changeType(e.target.value as BankQuestionType)}>
                {BANK_QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="qb-difficulty">
              <Form.Label>Difficulty</Form.Label>
              <Form.Select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as BankQuestionDifficulty)}>
                {BANK_DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="qb-status">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status} onChange={(e) => set('status', e.target.value as BankQuestionStatus)}>
                {BANK_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col xs={12}>
            <Form.Group controlId="qb-text">
              <Form.Label>Question *</Form.Label>
              <Form.Control as="textarea" rows={3} maxLength={2000} value={form.questionText} onChange={(e) => set('questionText', e.target.value)} />
            </Form.Group>
          </Col>

          {isCode ? (
            <Col xs={12}>
              <BankCodeFields value={form.code} onChange={(code) => set('code', code)} />
            </Col>
          ) : (
          <Col xs={12}>
            <Form.Label className="d-block">
              Options * <span className="text-muted small">({form.questionType === 'MultiSelect' ? 'tick every correct answer' : 'select the correct answer'})</span>
            </Form.Label>
            {form.options.map((option, index) => (
              <div key={index} className="d-flex align-items-center gap-2 mb-2">
                <Form.Check
                  type={form.questionType === 'MultiSelect' ? 'checkbox' : 'radio'}
                  name="qb-correct"
                  aria-label={`Option ${index + 1} is correct`}
                  checked={option.isCorrect}
                  onChange={(e) => setCorrect(index, e.target.checked)}
                />
                <Form.Control
                  value={option.text}
                  readOnly={isTrueFalse}
                  maxLength={500}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1} text`}
                  onChange={(e) => set('options', form.options.map((o, i) => (i === index ? { ...o, text: e.target.value } : o)))}
                />
                {!isTrueFalse && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={form.options.length <= 2}
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => set('options', form.options.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {!isTrueFalse && form.options.length < 8 && (
              <Button variant="outline-secondary" size="sm" onClick={() => set('options', [...form.options, { text: '', isCorrect: false }])}>
                + Add option
              </Button>
            )}
          </Col>
          )}

          <Col md={4}>
            <Form.Group controlId="qb-marks">
              <Form.Label>Default Marks *</Form.Label>
              <Form.Control type="number" min={1} value={form.defaultMarks} onChange={(e) => set('defaultMarks', e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="qb-negative">
              <Form.Label>Negative Marks</Form.Label>
              <Form.Control type="number" min={0} step="0.25" value={form.negativeMarks} onChange={(e) => set('negativeMarks', e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Form.Check
              id="qb-shuffle"
              type="switch"
              label="Shuffle options"
              checked={form.shuffleOptions}
              disabled={isTrueFalse || isCode}
              onChange={(e) => set('shuffleOptions', e.target.checked)}
            />
          </Col>

          <Col xs={12}>
            <Form.Group controlId="qb-explanation">
              <Form.Label>Explanation</Form.Label>
              <Form.Control as="textarea" rows={2} maxLength={2000} value={form.explanation} onChange={(e) => set('explanation', e.target.value)} />
            </Form.Group>
          </Col>

          <Col xs={12}>
            <Form.Label className="d-block">Tags</Form.Label>
            {tags.length === 0 && <span className="text-muted small">No tags yet - create some under Tags.</span>}
            <div className="d-flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = form.tagIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    as="button"
                    type="button"
                    bg={selected ? 'primary' : 'light'}
                    text={selected ? undefined : 'dark'}
                    className="border-0 px-3 py-2"
                    aria-pressed={selected}
                    onClick={() => set('tagIds', selected ? form.tagIds.filter((id) => id !== tag.id) : [...form.tagIds, tag.id])}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving...' : question ? 'Save Changes' : 'Add to Bank'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
