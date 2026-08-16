import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { createExam } from '../../api/examApi';
import { validateCreateExam } from '../../utils/createExamValidation';
import type { CreateExamRequest, ExamType } from '../../types/exam';
import { extractServerError } from '../../utils/apiError';

const initialFormState: CreateExamRequest = {
  title: '',
  description: '',
  examType: 'Manual',
  durationMinutes: 60,
  totalMarks: 100,
  passingMarks: 40,
  instructions: '',
};

export default function CreateExam() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateExamRequest>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateExamRequest, string>>>(
    {},
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const updateField = <K extends keyof CreateExamRequest>(field: K, value: CreateExamRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors = validateCreateExam(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await createExam(form);
      navigate('/admin/exams');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Create Exam</h1>
        <p className="text-muted mb-0">Basic Information</p>
      </div>

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form noValidate onSubmit={handleSubmit}>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3" controlId="examTitle">
                  <Form.Label className="fw-bold">Exam Title</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter exam title"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    isInvalid={!!fieldErrors.title}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.title}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="examType">
                  <Form.Label className="fw-bold">Exam Type</Form.Label>
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

            <Form.Group className="mb-3" controlId="examDescription">
              <Form.Label className="fw-bold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter exam description"
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
                <Form.Group className="mb-3" controlId="examDuration">
                  <Form.Label className="fw-bold">Duration (minutes)</Form.Label>
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
                <Form.Group className="mb-3" controlId="examTotalMarks">
                  <Form.Label className="fw-bold">Total Marks</Form.Label>
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
                <Form.Group className="mb-3" controlId="examPassingMarks">
                  <Form.Label className="fw-bold">Passing Marks</Form.Label>
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

            <Form.Group className="mb-4" controlId="examInstructions">
              <Form.Label className="fw-bold">Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter instructions for students"
                value={form.instructions}
                onChange={(e) => updateField('instructions', e.target.value)}
                isInvalid={!!fieldErrors.instructions}
              />
              <Form.Control.Feedback type="invalid">
                {fieldErrors.instructions}
              </Form.Control.Feedback>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Exam'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
