import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { updateQuestion } from '../../api/questionApi';
import { useQuestion } from '../../hooks/useQuestions';
import { validateCreateQuestion } from '../../utils/createQuestionValidation';
import type {
  CreateQuestionOptionRequest,
  QuestionDifficulty,
  QuestionResponse,
  QuestionType,
  UpdateQuestionRequest,
} from '../../types/question';

let nextOptionKey = 0;

interface OptionFormState extends CreateQuestionOptionRequest {
  key: number;
}

function newOption(): OptionFormState {
  return { key: nextOptionKey++, optionText: '', isCorrect: false };
}

function trueFalseOptions(existing: CreateQuestionOptionRequest[]): OptionFormState[] {
  return [
    {
      key: nextOptionKey++,
      optionText: 'True',
      isCorrect: existing.find((o) => o.optionText === 'True')?.isCorrect ?? false,
    },
    {
      key: nextOptionKey++,
      optionText: 'False',
      isCorrect: existing.find((o) => o.optionText === 'False')?.isCorrect ?? false,
    },
  ];
}

function toOptionFormState(question: QuestionResponse): OptionFormState[] {
  return question.options
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((o) => ({ key: nextOptionKey++, optionText: o.optionText, isCorrect: o.isCorrect }));
}

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function EditQuestion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: question, isLoading, isError } = useQuestion(id);

  const [questionType, setQuestionType] = useState<QuestionType>('MultipleChoice');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [options, setOptions] = useState<OptionFormState[]>([]);
  const [errors, setErrors] = useState<ReturnType<typeof validateCreateQuestion>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (question) {
      setQuestionType(question.questionType);
      setQuestionText(question.questionText);
      setMarks(question.marks);
      setDifficulty(question.difficulty);
      setOptions(toOptionFormState(question));
    }
  }, [question]);

  const changeQuestionType = (type: QuestionType) => {
    setQuestionType(type);
    setOptions(type === 'TrueFalse' ? trueFalseOptions(options) : [newOption(), newOption()]);
  };

  const updateOptionText = (key: number, text: string) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, optionText: text } : o)));
  };

  const markCorrect = (key: number) => {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));
  };

  const addOption = () => setOptions((prev) => [...prev, newOption()]);

  const removeOption = (key: number) =>
    setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.key !== key) : prev));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) {
      return;
    }

    const form: UpdateQuestionRequest = {
      questionType,
      questionText,
      marks,
      difficulty,
      options: options.map(({ optionText, isCorrect }) => ({ optionText, isCorrect })),
    };

    const validationErrors = validateCreateQuestion(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await updateQuestion(id, form);
      navigate(`/admin/exams/${question!.examId}/edit`);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  const backLink = question ? `/admin/exams/${question.examId}/edit` : '/admin/questions';

  return (
    <AdminLayout active="Questions">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0">Edit Question</h1>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Couldn't load this question. It may not exist.</Alert>
      )}

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      {question && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Form noValidate onSubmit={handleSubmit}>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3" controlId="editQuestionType">
                    <Form.Label>Question Type</Form.Label>
                    <Form.Select
                      value={questionType}
                      onChange={(e) => changeQuestionType(e.target.value as QuestionType)}
                    >
                      <option value="MultipleChoice">Multiple Choice</option>
                      <option value="TrueFalse">True/False</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3" controlId="editQuestionDifficulty">
                    <Form.Label>Difficulty</Form.Label>
                    <Form.Select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="editQuestionText">
                <Form.Label>Question</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  isInvalid={!!errors.questionText}
                />
                <Form.Control.Feedback type="invalid">{errors.questionText}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4" controlId="editQuestionMarks" style={{ maxWidth: 160 }}>
                <Form.Label>Marks</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  isInvalid={!!errors.marks}
                />
                <Form.Control.Feedback type="invalid">{errors.marks}</Form.Control.Feedback>
              </Form.Group>

              <Form.Label>Options</Form.Label>
              {errors.options && <div className="text-danger small mb-2">{errors.options}</div>}
              {options.map((option, index) => (
                <div key={option.key} className="d-flex align-items-center gap-2 mb-2">
                  <Form.Check
                    type="radio"
                    name="correctOption"
                    checked={option.isCorrect}
                    onChange={() => markCorrect(option.key)}
                    aria-label={`Mark option ${index + 1} correct`}
                  />
                  <Form.Control
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option.optionText}
                    disabled={questionType === 'TrueFalse'}
                    onChange={(e) => updateOptionText(option.key, e.target.value)}
                  />
                  {questionType === 'MultipleChoice' && options.length > 2 && (
                    <Button
                      variant="link"
                      className="text-danger"
                      onClick={() => removeOption(option.key)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {questionType === 'MultipleChoice' && (
                <Button variant="outline-secondary" size="sm" className="mb-4" onClick={addOption}>
                  + Add Option
                </Button>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Link to={backLink} className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}
