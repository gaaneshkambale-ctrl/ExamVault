import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { createExam } from '../../api/examApi';
import { validateCreateExam } from '../../utils/createExamValidation';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { CreateExamRequest, ExamType } from '../../types/exam';
import { extractServerError } from '../../utils/apiError';
import ExamWizardStepper from '../../components/ExamWizardStepper';

const initialFormState: CreateExamRequest = {
  title: '',
  examCode: '',
  description: '',
  category: '',
  containsSections: false,
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
      const exam = await createExam(form);
      navigate(
        exam.containsSections
          ? `/admin/exams/${exam.id}/wizard/sections`
          : `/admin/exams/${exam.id}/wizard/configuration`,
      );
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

      <ExamWizardStepper currentStep={1} containsSections={form.containsSections} />

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form noValidate onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
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
              <Col md={3}>
                <Form.Group className="mb-3" controlId="examCode">
                  <Form.Label className="fw-bold">Exam Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. NET-2026-01"
                    value={form.examCode ?? ''}
                    onChange={(e) => updateField('examCode', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
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

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="examCategory">
                  <Form.Label className="fw-bold">Category</Form.Label>
                  <Form.Select
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    isInvalid={!!fieldErrors.category}
                  >
                    <option value="">Select a category</option>
                    {EXAM_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{fieldErrors.category}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={8} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="examContainsSections"
                  className="mb-3"
                  label="This exam contains sections"
                  checked={form.containsSections}
                  onChange={(e) => updateField('containsSections', e.target.checked)}
                />
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
