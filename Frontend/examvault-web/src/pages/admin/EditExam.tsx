import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import SectionHeader from '../../components/SectionHeader';
import { archiveExam, publishExam, unpublishExam, updateExam } from '../../api/examApi';
import { useExam, useExamTypes } from '../../hooks/useExams';
import { validateCreateExam } from '../../utils/createExamValidation';
import type { CreationMethod, ExamResponse, ExamStatus, UpdateExamRequest } from '../../types/exam';
import { extractServerError } from '../../utils/apiError';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SettingIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const icons = {
  shuffleQuestions: (
    <SettingIcon>
      <path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
    </SettingIcon>
  ),
  shuffleOptions: (
    <SettingIcon>
      <rect x="3" y="4" width="7" height="7" rx="1" /><rect x="14" y="13" width="7" height="7" rx="1" />
      <path d="M10 7h6a2 2 0 0 1 2 2v4" /><path d="M14 17H8a2 2 0 0 1-2-2V9" />
    </SettingIcon>
  ),
  showResult: (
    <SettingIcon>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
    </SettingIcon>
  ),
  showCorrectAnswers: (
    <SettingIcon>
      <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" />
    </SettingIcon>
  ),
  allowReview: (
    <SettingIcon>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
    </SettingIcon>
  ),
  schedule: (
    <SettingIcon>
      <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
    </SettingIcon>
  ),
  maxAttempts: (
    <SettingIcon>
      <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h3" />
    </SettingIcon>
  ),
  negativeMarking: (
    <SettingIcon>
      <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </SettingIcon>
  ),
  questionNavigation: (
    <SettingIcon>
      <circle cx="12" cy="12" r="9" /><path d="M16 8l-3 5-5 3 3-5 5-3z" />
    </SettingIcon>
  ),
  autoSubmit: (
    <SettingIcon>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </SettingIcon>
  ),
  examInstructions: (
    <SettingIcon>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M9 13h6" /><path d="M9 17h6" />
    </SettingIcon>
  ),
  sectionSummary: (
    <SettingIcon>
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </SettingIcon>
  ),
  calculator: (
    <SettingIcon>
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11" /><line x1="12" y1="11" x2="12" y2="11" /><line x1="16" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="8" y2="15" /><line x1="12" y1="15" x2="12" y2="15" /><line x1="16" y1="15" x2="16" y2="18" />
      <line x1="8" y1="18" x2="8" y2="18" /><line x1="12" y1="18" x2="12" y2="18" />
    </SettingIcon>
  ),
  notes: (
    <SettingIcon>
      <path d="M4 4h16v16H4z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
    </SettingIcon>
  ),
  confirmSubmit: (
    <SettingIcon>
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </SettingIcon>
  ),
};

interface SettingCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  children?: ReactNode;
}

function SettingCard({ icon, title, description, checked, onToggle, children }: SettingCardProps) {
  return (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body className="p-3">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="d-flex align-items-start gap-3">
            <div
              className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 36, height: 36 }}
            >
              {icon}
            </div>
            <div>
              <div className="fw-bold">{title}</div>
              <div className="text-muted small">{description}</div>
            </div>
          </div>
          <Form.Check
            type="switch"
            aria-label={title}
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="flex-shrink-0"
          />
        </div>
        {children && <div className="mt-3">{children}</div>}
      </Card.Body>
    </Card>
  );
}

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


export default function EditExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: examTypes } = useExamTypes();

  const [form, setForm] = useState<UpdateExamRequest | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateExamRequest, string>>>(
    {},
  );
  const [serverError, setServerError] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // UI-only toggles: not yet backed by exam settings on the server.
  const [maxAttemptsEnabled, setMaxAttemptsEnabled] = useState(true);
  const [questionNavigationEnabled, setQuestionNavigationEnabled] = useState(true);
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState(true);
  const [examInstructionsEnabled, setExamInstructionsEnabled] = useState(true);

  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const handleEditInstructions = () => {
    instructionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    instructionsRef.current?.focus();
  };

  useEffect(() => {
    if (exam) {
      setForm(toFormState(exam));
      setScheduleEnabled(Boolean(exam.startAtUtc) || Boolean(exam.endAtUtc));
    }
  }, [exam]);

  const toggleSchedule = (enabled: boolean) => {
    setScheduleEnabled(enabled);
    if (!enabled) {
      updateField('startAtUtc', null);
      updateField('endAtUtc', null);
    }
  };

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
      navigate('/admin/exams');
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
    <RoleAwareLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Edit Exam</h1>
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

              <Form noValidate onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="editExamTitle">
                      <Form.Label className="fw-bold">Exam Title</Form.Label>
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
                  <Col md={3}>
                    <Form.Group className="mb-3" controlId="editExamCode">
                      <Form.Label className="fw-bold">Exam Code</Form.Label>
                      <Form.Control type="text" value={form.examCode ?? ''} disabled readOnly />
                      <Form.Text className="text-muted">System-generated, not editable.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3" controlId="editCreationMethod">
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
                    <Form.Group className="mb-3" controlId="editExamTypeId">
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
                </Row>

                <Form.Group className="mb-3" controlId="editExamDescription">
                  <Form.Label className="fw-bold">Description</Form.Label>
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
                    <Form.Group className="mb-3" controlId="editExamTotalMarks">
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
                    <Form.Group className="mb-3" controlId="editExamPassingMarks">
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

                <Form.Group className="mb-4" controlId="editExamInstructions">
                  <Form.Label className="fw-bold">Instructions</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    ref={instructionsRef}
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    isInvalid={!!fieldErrors.instructions}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.instructions}
                  </Form.Control.Feedback>
                </Form.Group>

                <SectionHeader
                  icon={<GearIcon />}
                  title="Exam Settings"
                  subtitle="Configure exam behavior and rules for students."
                />

                <Row>
                  <Col md={6}>
                    <SettingCard
                      icon={icons.shuffleQuestions}
                      title="Shuffle Questions"
                      description="Shuffle question order for each student"
                      checked={form.shuffleQuestions}
                      onToggle={(checked) => updateField('shuffleQuestions', checked)}
                    />
                    <SettingCard
                      icon={icons.shuffleOptions}
                      title="Shuffle Options (MCQ)"
                      description="Shuffle options for multiple choice questions"
                      checked={form.shuffleOptions}
                      onToggle={(checked) => updateField('shuffleOptions', checked)}
                    />
                    <SettingCard
                      icon={icons.showResult}
                      title="Show Result to Student"
                      description="Show result after exam submission"
                      checked={form.showResult}
                      onToggle={(checked) => updateField('showResult', checked)}
                    />
                    <SettingCard
                      icon={icons.showCorrectAnswers}
                      title="Show Correct Answers"
                      description="Show correct answers after exam"
                      checked={form.showCorrectAnswers}
                      onToggle={(checked) => updateField('showCorrectAnswers', checked)}
                    />
                    <SettingCard
                      icon={icons.allowReview}
                      title="Allow Review"
                      description="Allow students to review answers before submission"
                      checked={form.allowReview}
                      onToggle={(checked) => updateField('allowReview', checked)}
                    />
                    <SettingCard
                      icon={icons.schedule}
                      title="Start & End Time (Schedule Exam)"
                      description="Schedule exam start and end date & time"
                      checked={scheduleEnabled}
                      onToggle={toggleSchedule}
                    >
                      {scheduleEnabled && (
                        <>
                          <Form.Group className="mb-3" controlId="editStartAt">
                            <Form.Label className="fw-bold small">Start Date &amp; Time</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              value={toDatetimeLocal(form.startAtUtc)}
                              onChange={(e) => updateField('startAtUtc', fromDatetimeLocal(e.target.value))}
                            />
                          </Form.Group>
                          <Form.Group controlId="editEndAt">
                            <Form.Label className="fw-bold small">End Date &amp; Time</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              value={toDatetimeLocal(form.endAtUtc)}
                              onChange={(e) => updateField('endAtUtc', fromDatetimeLocal(e.target.value))}
                            />
                          </Form.Group>
                        </>
                      )}
                    </SettingCard>
                  </Col>
                  <Col md={6}>
                    <SettingCard
                      icon={icons.maxAttempts}
                      title="Maximum Attempts"
                      description="Limit the number of attempts per student"
                      checked={maxAttemptsEnabled}
                      onToggle={setMaxAttemptsEnabled}
                    >
                      {maxAttemptsEnabled && (
                        <Form.Group controlId="editMaxAttempts">
                          <Form.Label className="fw-bold small">Max Attempts Allowed</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            value={form.maxAttempts}
                            onChange={(e) => updateField('maxAttempts', Number(e.target.value))}
                          />
                        </Form.Group>
                      )}
                    </SettingCard>
                    <SettingCard
                      icon={icons.negativeMarking}
                      title="Negative Marking"
                      description="Enable or disable negative marking"
                      checked={form.negativeMarkingEnabled}
                      onToggle={(checked) => updateField('negativeMarkingEnabled', checked)}
                    >
                      {form.negativeMarkingEnabled && (
                        <Form.Group controlId="editNegativeMarks">
                          <Form.Label className="fw-bold small">Negative Marks for Wrong Answer</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            step={0.25}
                            value={form.negativeMarks}
                            onChange={(e) => updateField('negativeMarks', Number(e.target.value))}
                          />
                        </Form.Group>
                      )}
                    </SettingCard>
                    <SettingCard
                      icon={icons.questionNavigation}
                      title="Question Navigation"
                      description="Students can navigate between questions"
                      checked={questionNavigationEnabled}
                      onToggle={setQuestionNavigationEnabled}
                    />
                    <SettingCard
                      icon={icons.autoSubmit}
                      title="Auto Submit"
                      description="Automatically submit exam when time is over"
                      checked={autoSubmitEnabled}
                      onToggle={setAutoSubmitEnabled}
                    />
                    <SettingCard
                      icon={icons.examInstructions}
                      title="Exam Instructions"
                      description="Show instructions before exam starts"
                      checked={examInstructionsEnabled}
                      onToggle={setExamInstructionsEnabled}
                    >
                      {examInstructionsEnabled && (
                        <Button variant="outline-primary" size="sm" onClick={handleEditInstructions}>
                          Edit Instructions
                        </Button>
                      )}
                    </SettingCard>
                  </Col>
                </Row>

                <div className="mt-2">
                  <SectionHeader
                    icon={<span style={{ color: '#4f46e5' }}>{icons.sectionSummary}</span>}
                    title="Exam Configuration"
                    subtitle="Additional preferences for the student experience during this exam."
                  />
                </div>

                <Row>
                  <Col md={6}>
                    <SettingCard
                      icon={icons.sectionSummary}
                      title="Show Section Summary to Students"
                      description="Show a breakdown of sections before the exam starts"
                      checked={form.showSectionSummaryToStudents}
                      onToggle={(checked) => updateField('showSectionSummaryToStudents', checked)}
                    />
                    <SettingCard
                      icon={icons.calculator}
                      title="Allow Calculator"
                      description="Let students use an on-screen calculator"
                      checked={form.allowCalculator}
                      onToggle={(checked) => updateField('allowCalculator', checked)}
                    />
                    <SettingCard
                      icon={icons.notes}
                      title="Allow Notes"
                      description="Let students jot down notes during the exam"
                      checked={form.allowNotes}
                      onToggle={(checked) => updateField('allowNotes', checked)}
                    />
                  </Col>
                  <Col md={6}>
                    <SettingCard
                      icon={icons.autoSubmit}
                      title="Auto Submit on Time End"
                      description="Automatically submit the exam when time runs out"
                      checked={form.autoSubmitOnTimeEnd}
                      onToggle={(checked) => updateField('autoSubmitOnTimeEnd', checked)}
                    />
                    <SettingCard
                      icon={icons.confirmSubmit}
                      title="Confirm Before Submit"
                      description="Ask students to confirm before their final submission"
                      checked={form.confirmBeforeSubmit}
                      onToggle={(checked) => updateField('confirmBeforeSubmit', checked)}
                    />
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2 mt-2">
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
        </>
      )}
    </RoleAwareLayout>
  );
}
