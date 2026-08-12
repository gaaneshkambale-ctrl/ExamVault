import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { createQuestion } from '../../api/questionApi';
import { useExam } from '../../hooks/useExams';
import { validateCreateQuestion } from '../../utils/createQuestionValidation';
import type {
  CreateQuestionOptionRequest,
  CreateQuestionRequest,
  QuestionDifficulty,
  QuestionType,
} from '../../types/question';

let nextOptionKey = 0;

interface OptionFormState extends CreateQuestionOptionRequest {
  key: number;
}

function newOption(): OptionFormState {
  return { key: nextOptionKey++, optionText: '', isCorrect: false };
}

function trueFalseOptions(): OptionFormState[] {
  return [
    { key: nextOptionKey++, optionText: 'True', isCorrect: false },
    { key: nextOptionKey++, optionText: 'False', isCorrect: false },
  ];
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

export default function CreateQuestion() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: exam } = useExam(examId);

  const [questionType, setQuestionType] = useState<QuestionType>('MultipleChoice');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [options, setOptions] = useState<OptionFormState[]>([newOption(), newOption()]);
  const [errors, setErrors] = useState<ReturnType<typeof validateCreateQuestion>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const changeQuestionType = (type: QuestionType) => {
    setQuestionType(type);
    setOptions(type === 'TrueFalse' ? trueFalseOptions() : [newOption(), newOption()]);
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
    if (!examId) {
      return;
    }

    const form: CreateQuestionRequest = {
      examId,
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
      await createQuestion(form);
      navigate(`/admin/exams/${examId}/edit`);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <AdminLayout active="Questions">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0">Add Question</h1>
        <p className="text-muted mb-0">
          {exam ? `Exam: ${exam.title}` : 'Loading exam...'}
        </p>
      </div>

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form noValidate onSubmit={handleSubmit}>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3" controlId="questionType">
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
                <Form.Group className="mb-3" controlId="questionDifficulty">
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

            <Form.Group className="mb-3" controlId="questionText">
              <Form.Label>Question</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter your question here"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                isInvalid={!!errors.questionText}
              />
              <Form.Control.Feedback type="invalid">{errors.questionText}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="questionMarks" style={{ maxWidth: 160 }}>
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
              <Link to={`/admin/exams/${examId}/edit`} className="btn btn-outline-secondary">
                Cancel
              </Link>
              <Button type="submit" variant="primary" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Question'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
