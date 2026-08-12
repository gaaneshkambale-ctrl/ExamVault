import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { archiveExam, publishExam, unpublishExam, updateExam } from '../../api/examApi';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { validateCreateExam } from '../../utils/createExamValidation';
import type { ExamResponse, ExamStatus, ExamType, UpdateExamRequest } from '../../types/exam';
import type { QuestionDifficulty, QuestionType } from '../../types/question';

const difficultyVariant: Record<QuestionDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const questionTypeLabel: Record<QuestionType, string> = {
  MultipleChoice: 'Multiple Choice',
  TrueFalse: 'True/False',
};

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

function toDatetimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }
  return new Date(value).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toFormState(exam: ExamResponse): UpdateExamRequest {
  const { id: _id, status: _status, totalQuestions: _totalQuestions, createdOn: _createdOn, ...form } =
    exam;
  return form;
}

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
    if (error.response?.status === 409) {
      return 'That status change is not allowed from the exam’s current state.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function EditExam() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(id);

  const [form, setForm] = useState<UpdateExamRequest | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateExamRequest, string>>>(
    {},
  );
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (exam) {
      setForm(toFormState(exam));
    }
  }, [exam]);

  const invalidateExam = () => {
    queryClient.invalidateQueries({ queryKey: ['exams'] });
    queryClient.invalidateQueries({ queryKey: ['exams', id] });
  };

  const saveMutation = useMutation({
    mutationFn: (request: UpdateExamRequest) => updateExam(id!, request),
    onSuccess: (updated) => {
      setForm(toFormState(updated));
      setServerError('');
      invalidateExam();
    },
    onError: (error) => setServerError(extractServerError(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishExam(id!),
    onSuccess: () => invalidateExam(),
    onError: (error) => setServerError(extractServerError(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishExam(id!),
    onSuccess: () => invalidateExam(),
    onError: (error) => setServerError(extractServerError(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveExam(id!),
    onSuccess: () => invalidateExam(),
    onError: (error) => setServerError(extractServerError(error)),
  });

  const updateField = <K extends keyof UpdateExamRequest>(field: K, value: UpdateExamRequest[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) {
      return;
    }

    const errors = validateCreateExam(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    saveMutation.mutate(form);
  };

  const anyStatusActionPending =
    publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending;

  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0">Edit Exam</h1>
          <p className="text-muted mb-0">Basic Information &amp; Settings</p>
        </div>
        <Link to="/admin/exams" className="btn btn-outline-secondary">
          Back to Exams
        </Link>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Couldn't load this exam. It may not exist.</Alert>
      )}

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      {exam && form && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Badge bg={statusVariant[exam.status]} className="fs-6">
                  {exam.status}
                </Badge>
                <div className="d-flex gap-2">
                  {exam.status === 'Draft' && (
                    <Button
                      variant="success"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => publishMutation.mutate()}
                    >
                      {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                    </Button>
                  )}
                  {exam.status === 'Published' && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => unpublishMutation.mutate()}
                    >
                      {unpublishMutation.isPending ? 'Saving...' : 'Save as Draft'}
                    </Button>
                  )}
                  {exam.status !== 'Archived' && (
                    <Button
                      variant="outline-dark"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => archiveMutation.mutate()}
                    >
                      {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <Link to={`/admin/exams/${id}/questions/create`} className="btn btn-outline-primary btn-sm">
                  + Add Question
                </Link>
              </div>

              <Form noValidate onSubmit={handleSubmit}>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3" controlId="editExamTitle">
                      <Form.Label>Exam Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        isInvalid={!!fieldErrors.title}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.title}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="editExamType">
                      <Form.Label>Exam Type</Form.Label>
                      <Form.Select
                        value={form.examType}
                        onChange={(e) => updateField('examType', e.target.value as ExamType)}
                      >
                        <option value="Manual">Manual</option>
                        <option value="AiGenerated">AI Generated</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="editExamDescription">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    isInvalid={!!fieldErrors.description}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.description}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="editExamDuration">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        value={form.durationMinutes}
                        onChange={(e) => updateField('durationMinutes', Number(e.target.value))}
                        isInvalid={!!fieldErrors.durationMinutes}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.durationMinutes}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="editExamTotalMarks">
                      <Form.Label>Total Marks</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        value={form.totalMarks}
                        onChange={(e) => updateField('totalMarks', Number(e.target.value))}
                        isInvalid={!!fieldErrors.totalMarks}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.totalMarks}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="editExamPassingMarks">
                      <Form.Label>Passing Marks</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        value={form.passingMarks}
                        onChange={(e) => updateField('passingMarks', Number(e.target.value))}
                        isInvalid={!!fieldErrors.passingMarks}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.passingMarks}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4" controlId="editExamInstructions">
                  <Form.Label>Instructions</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    isInvalid={!!fieldErrors.instructions}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.instructions}
                  </Form.Control.Feedback>
                </Form.Group>

                <h2 className="h6 fw-bold mb-3">Exam Settings</h2>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="editShuffleQuestions"
                      label="Shuffle Questions"
                      checked={form.shuffleQuestions}
                      onChange={(e) => updateField('shuffleQuestions', e.target.checked)}
                    />
                    <Form.Check
                      type="switch"
                      id="editShuffleOptions"
                      label="Shuffle Options"
                      checked={form.shuffleOptions}
                      onChange={(e) => updateField('shuffleOptions', e.target.checked)}
                    />
                    <Form.Check
                      type="switch"
                      id="editShowResult"
                      label="Show Result"
                      checked={form.showResult}
                      onChange={(e) => updateField('showResult', e.target.checked)}
                    />
                    <Form.Check
                      type="switch"
                      id="editShowCorrectAnswers"
                      label="Show Correct Answers"
                      checked={form.showCorrectAnswers}
                      onChange={(e) => updateField('showCorrectAnswers', e.target.checked)}
                    />
                    <Form.Check
                      type="switch"
                      id="editAllowReview"
                      label="Allow Review"
                      checked={form.allowReview}
                      onChange={(e) => updateField('allowReview', e.target.checked)}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="editStartAt">
                      <Form.Label>Start Date &amp; Time</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={toDatetimeLocal(form.startAtUtc)}
                        onChange={(e) => updateField('startAtUtc', fromDatetimeLocal(e.target.value))}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="editEndAt">
                      <Form.Label>End Date &amp; Time</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={toDatetimeLocal(form.endAtUtc)}
                        onChange={(e) => updateField('endAtUtc', fromDatetimeLocal(e.target.value))}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="editMaxAttempts">
                      <Form.Label>Maximum Attempts</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        value={form.maxAttempts}
                        onChange={(e) => updateField('maxAttempts', Number(e.target.value))}
                      />
                    </Form.Group>
                    <Form.Check
                      type="switch"
                      id="editNegativeMarkingEnabled"
                      label="Negative Marking"
                      checked={form.negativeMarkingEnabled}
                      onChange={(e) => updateField('negativeMarkingEnabled', e.target.checked)}
                      className="mb-3"
                    />
                    {form.negativeMarkingEnabled && (
                      <Form.Group className="mb-3" controlId="editNegativeMarks">
                        <Form.Label>Negative Marks (per wrong answer)</Form.Label>
                        <Form.Control
                          type="number"
                          min={0}
                          step={0.25}
                          value={form.negativeMarks}
                          onChange={(e) => updateField('negativeMarks', Number(e.target.value))}
                        />
                      </Form.Group>
                    )}
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2">
                  <Link to="/admin/exams" className="btn btn-outline-secondary">
                    Cancel
                  </Link>
                  <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
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

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="d-flex justify-content-between align-items-center p-4 pb-3">
                <h2 className="h6 fw-bold mb-0">Questions</h2>
              </div>

              {isLoadingQuestions && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" size="sm" />
                </div>
              )}

              {!isLoadingQuestions && questions?.length === 0 && (
                <div className="text-center text-muted py-4">
                  No questions yet. Click "+ Add Question" above to add one.
                </div>
              )}

              {!isLoadingQuestions && questions && questions.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Question</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Marks</th>
                      <th className="pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((question) => (
                      <tr key={question.id}>
                        <td className="ps-4 fw-medium" style={{ maxWidth: 360 }}>
                          {question.questionText}
                        </td>
                        <td>{questionTypeLabel[question.questionType]}</td>
                        <td>
                          <Badge bg={difficultyVariant[question.difficulty]}>
                            {question.difficulty}
                          </Badge>
                        </td>
                        <td>{question.marks}</td>
                        <td className="pe-4">
                          <Link to={`/admin/questions/${question.id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
