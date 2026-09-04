import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { createExam } from '../../api/examApi';
import { validateCreateExam } from '../../utils/createExamValidation';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { CreateExamRequest, CreationMethod } from '../../types/exam';
import { useExamDefaults, useExamTypes } from '../../hooks/useExams';
import { extractServerError } from '../../utils/apiError';
import ExamWizardStepper from '../../components/ExamWizardStepper';

const TITLE_MAX = 200;
const TAGS_MAX = 500;
const DESCRIPTION_MAX = 2000;
const INSTRUCTIONS_MAX = 2000;

const initialFormState: CreateExamRequest = {
  title: '',
  description: '',
  category: '',
  containsSections: false,
  creationMethod: 'Manual',
  durationMinutes: 60,
  totalMarks: 100,
  passingMarks: 40,
  instructions: '',
  examTypeId: null,
  tags: '',
};

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MarksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="d-flex justify-content-between align-items-center py-1">
      <span className="text-muted small">{label}</span>
      <span className="small fw-medium text-end">{value}</span>
    </div>
  );
}

const QUICK_HELP = [
  { title: 'Exam Title', text: 'Use a clear, descriptive title that students can easily recognize.' },
  { title: 'Sections', text: 'Enable sections if you want to group questions by topic or difficulty.' },
  { title: 'Passing Marks', text: 'Set the minimum marks a student must score to pass this exam.' },
];

export default function CreateExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreateExams = user?.role !== 'Instructor' || hasPermission('Exams - Create');
  const { data: examTypes } = useExamTypes();
  const { data: examDefaults } = useExamDefaults();
  const [form, setForm] = useState<CreateExamRequest>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateExamRequest, string>>>(
    {},
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  // Exam Settings' configured defaults now actually prefill this form (see
  // ExamDefaults.cs's own doc comment - this was the deferred half of that
  // gap, CreateExamHandler covers the fields not collected here at all).
  // Only applies while Duration/Passing Marks still match the untouched
  // hardcoded initial state, so it can never clobber something the Admin
  // already typed - including if this query happens to resolve late.
  useEffect(() => {
    if (!examDefaults) return;
    setForm((prev) =>
      prev.durationMinutes === initialFormState.durationMinutes && prev.passingMarks === initialFormState.passingMarks
        ? {
            ...prev,
            durationMinutes: examDefaults.defaultDurationMinutes,
            passingMarks: Math.round((prev.totalMarks * examDefaults.passingScorePercent) / 100),
          }
        : prev,
    );
  }, [examDefaults]);

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

  const selectedExamTypeName = examTypes?.find((t) => t.id === form.examTypeId)?.name;

  return (
    <RoleAwareLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Create Exam</h1>
        <p className="text-muted mb-0">Basic Information</p>
      </div>

      <ExamWizardStepper currentStep={1} containsSections={form.containsSections} />

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      <Row className="g-4">
        <Col lg={8}>
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
                        maxLength={TITLE_MAX}
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        isInvalid={!!fieldErrors.title}
                      />
                      <div className="d-flex justify-content-between">
                        <Form.Control.Feedback type="invalid">{fieldErrors.title}</Form.Control.Feedback>
                        <div className="text-muted small ms-auto">{form.title.length}/{TITLE_MAX}</div>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="creationMethod">
                      <Form.Label className="fw-bold">Creation Method</Form.Label>
                      <Form.Select
                        value={form.creationMethod}
                        onChange={(e) => updateField('creationMethod', e.target.value as CreationMethod)}
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
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="examTypeId">
                      <Form.Label className="fw-bold">Exam Type</Form.Label>
                      <Form.Select
                        value={form.examTypeId ?? ''}
                        onChange={(e) => updateField('examTypeId', e.target.value || null)}
                      >
                        <option value="">Not set</option>
                        {examTypes?.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-start pt-4">
                    <Form.Check
                      type="switch"
                      id="examContainsSections"
                      className="mb-3 mt-2"
                      label="This exam contains sections"
                      checked={form.containsSections}
                      onChange={(e) => updateField('containsSections', e.target.checked)}
                    />
                  </Col>
                </Row>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3" controlId="examTags">
                      <Form.Label className="fw-bold">Tags</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. midterm, java, entry-level (comma-separated)"
                        maxLength={TAGS_MAX}
                        value={form.tags ?? ''}
                        onChange={(e) => updateField('tags', e.target.value)}
                      />
                      <div className="d-flex justify-content-between">
                        <Form.Text className="text-muted">Optional, comma-separated - helps you and the platform find this exam later.</Form.Text>
                        <div className="text-muted small ms-auto">{(form.tags ?? '').length}/{TAGS_MAX}</div>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="examDescription">
                  <Form.Label className="fw-bold">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter exam description"
                    maxLength={DESCRIPTION_MAX}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    isInvalid={!!fieldErrors.description}
                  />
                  <div className="d-flex justify-content-between">
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.description}
                    </Form.Control.Feedback>
                    <div className="text-muted small ms-auto">{form.description.length}/{DESCRIPTION_MAX}</div>
                  </div>
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="examDuration">
                      <Form.Label className="fw-bold">Duration (minutes)</Form.Label>
                      <InputGroup hasValidation>
                        <InputGroup.Text><ClockIcon /></InputGroup.Text>
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
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="examTotalMarks">
                      <Form.Label className="fw-bold">Total Marks</Form.Label>
                      <InputGroup hasValidation>
                        <InputGroup.Text><MarksIcon /></InputGroup.Text>
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
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="examPassingMarks">
                      <Form.Label className="fw-bold">Passing Marks</Form.Label>
                      <InputGroup hasValidation>
                        <InputGroup.Text><TargetIcon /></InputGroup.Text>
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
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4" controlId="examInstructions">
                  <Form.Label className="fw-bold">Instructions for Students</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter instructions for students"
                    maxLength={INSTRUCTIONS_MAX}
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    isInvalid={!!fieldErrors.instructions}
                  />
                  <div className="d-flex justify-content-between">
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.instructions}
                    </Form.Control.Feedback>
                    <div className="text-muted small ms-auto">{form.instructions.length}/{INSTRUCTIONS_MAX}</div>
                  </div>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')}>
                    Cancel
                  </Button>
                  {canCreateExams && (
                    <Button type="submit" variant="primary" disabled={status === 'loading'}>
                      {status === 'loading' ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        <>Save &amp; Next &rarr;</>
                      )}
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Exam Summary</Card.Title>
              <SummaryRow label="Title" value={form.title || '—'} />
              <SummaryRow label="Category" value={form.category || '—'} />
              <SummaryRow label="Exam Type" value={selectedExamTypeName ?? '—'} />
              <SummaryRow label="Creation Method" value={form.creationMethod === 'AiGenerated' ? 'AI Generated' : 'Manual'} />
              <SummaryRow label="Duration" value={form.durationMinutes ? `${form.durationMinutes} min` : '—'} />
              <SummaryRow label="Total Marks" value={form.totalMarks ? String(form.totalMarks) : '—'} />
              <SummaryRow label="Passing Marks" value={form.passingMarks || form.passingMarks === 0 ? String(form.passingMarks) : '—'} />
              <SummaryRow label="Sections" value={form.containsSections ? 'Enabled' : 'Not used'} />
              <SummaryRow label="Questions" value="—" />
              <SummaryRow label="Status" value="Draft" />
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-3" style={{ background: '#f5f3ff' }}>
            <Card.Body>
              <div className="d-flex gap-2">
                <BulbIcon />
                <div>
                  <div className="fw-bold small mb-1" style={{ color: '#5b21b6' }}>Tip</div>
                  <div className="small" style={{ color: '#5b21b6' }}>
                    You'll be able to add sections, questions, and review everything before
                    publishing this exam to students.
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3 d-flex align-items-center gap-2">
                <HelpIcon /> Quick Help
              </Card.Title>
              {QUICK_HELP.map((item) => (
                <div key={item.title} className="mb-3">
                  <div className="small fw-bold">{item.title}</div>
                  <div className="small text-muted">{item.text}</div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </RoleAwareLayout>
  );
}
