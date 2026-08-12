import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
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
  const queryClient = useQueryClient();
  const { data: question, isLoading, isError } = useQuestion(id);

  const [questionType, setQuestionType] = useState<QuestionType>('MultipleChoice');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [shuffleOptions, setShuffleOptions] = useState(false);
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
      setShuffleOptions(question.shuffleOptions);
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
      shuffleOptions,
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
      queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', question!.examId] });
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
      navigate('/admin/questions');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  const backLink = '/admin/questions';

  return (
    <AdminLayout active="Questions">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Edit Question</h1>
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
                <Col md={5}>
                  <Form.Group className="mb-3" controlId="editQuestionType">
                    <Form.Label className="fw-bold">Question Type</Form.Label>
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
                    <Form.Label className="fw-bold">Difficulty</Form.Label>
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
                <Col md={3} className="d-flex align-items-end mb-3">
                  <Form.Check
                    type="checkbox"
                    id="editShuffleOptions"
                    label={<span className="fw-bold">Shuffle Options</span>}
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                  />
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="editQuestionText">
                <Form.Label className="fw-bold">Question</Form.Label>
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
                <Form.Label className="fw-bold">Marks</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  isInvalid={!!errors.marks}
                />
                <Form.Control.Feedback type="invalid">{errors.marks}</Form.Control.Feedback>
              </Form.Group>

              <Form.Label className="fw-bold">Options</Form.Label>
              {errors.options && <div className="text-danger small mb-2">{errors.options}</div>}
              {options.map((option, index) => (
                <div key={option.key} className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light border fw-bold flex-shrink-0"
                    style={{ width: 32, height: 32 }}
                  >
                    {optionLetter(index)}
                  </span>
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
                <Button variant="outline-secondary" size="sm" className="mb-3" onClick={addOption}>
                  + Add Option
                </Button>
              )}

              <Form.Group className="mb-4" controlId="editCorrectAnswer" style={{ maxWidth: 320 }}>
                <Form.Label className="fw-bold">Correct Answer</Form.Label>
                <Form.Select
                  value={options.find((o) => o.isCorrect)?.key ?? ''}
                  onChange={(e) => markCorrect(Number(e.target.value))}
                  isInvalid={!!errors.options}
                >
                  <option value="" disabled>
                    Select correct answer
                  </option>
                  {options.map((option, index) => (
                    <option key={option.key} value={option.key}>
                      {optionLetter(index)} - {option.optionText || `Option ${index + 1}`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

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
