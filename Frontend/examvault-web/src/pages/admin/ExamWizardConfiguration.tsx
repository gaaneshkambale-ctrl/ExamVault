import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import ExamWizardStepper from '../../components/ExamWizardStepper';
import { updateExam } from '../../api/examApi';
import { useExam } from '../../hooks/useExams';
import type { UpdateExamRequest } from '../../types/exam';
import { extractServerError } from '../../utils/apiError';

function toFormState(exam: NonNullable<ReturnType<typeof useExam>['data']>): UpdateExamRequest {
  const { id: _id, status: _status, totalQuestions: _totalQuestions, createdOn: _createdOn, ...form } =
    exam;
  return form;
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

interface PreferenceToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PreferenceToggle({ id, label, description, checked, onChange }: PreferenceToggleProps) {
  return (
    <div className="d-flex justify-content-between align-items-start py-3 border-bottom">
      <div className="pe-3">
        <div className="fw-bold">{label}</div>
        <div className="text-muted small">{description}</div>
      </div>
      <Form.Check
        type="switch"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="flex-shrink-0"
      />
    </div>
  );
}

export default function ExamWizardConfiguration() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exam, isLoading } = useExam(examId);

  const [form, setForm] = useState<UpdateExamRequest | null>(null);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (exam) {
      setForm(toFormState(exam));
    }
  }, [exam]);

  const updateField = <K extends keyof UpdateExamRequest>(field: K, value: UpdateExamRequest[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveMutation = useMutation({
    mutationFn: (request: UpdateExamRequest) => updateExam(examId!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', examId] });
      navigate(`/admin/exams/${examId}/wizard/review`);
    },
    onError: (error) => setServerError(extractServerError(error)),
  });

  const handleNext = () => {
    if (!form) return;
    saveMutation.mutate(form);
  };

  const handleBack = () => {
    if (exam?.containsSections) {
      navigate(`/admin/exams/${examId}/wizard/sections`);
    } else {
      navigate('/admin/exams');
    }
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">Create Exam / {exam?.title ?? '...'}</p>
        <h1 className="h4 fw-bold mb-0 text-primary">Exam Configuration</h1>
        <p className="text-muted mb-2">Configure additional preferences for the exam experience</p>
      </div>

      <ExamWizardStepper currentStep={3} containsSections={Boolean(exam?.containsSections)} />

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {form && (
        <>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                  style={{ width: 36, height: 36, background: '#eef2ff' }}
                >
                  <GearIcon />
                </div>
                <div>
                  <div className="fw-bold">Exam Preferences</div>
                  <div className="text-muted small">Customize the exam experience for your students.</div>
                </div>
              </div>

              <Row>
                <Col md={6} className="pe-md-4">
                  <PreferenceToggle
                    id="wizardShowSectionSummary"
                    label="Show Section Summary to Students"
                    description="Allow students to view section summary (e.g., number of questions, marks) during the exam."
                    checked={form.showSectionSummaryToStudents}
                    onChange={(v) => updateField('showSectionSummaryToStudents', v)}
                  />
                  <PreferenceToggle
                    id="wizardAllowCalculator"
                    label="Allow Calculator"
                    description="Enable an on-screen calculator for students during the exam."
                    checked={form.allowCalculator}
                    onChange={(v) => updateField('allowCalculator', v)}
                  />
                  <PreferenceToggle
                    id="wizardAllowNotes"
                    label="Allow Notes"
                    description="Allow students to take notes during the exam."
                    checked={form.allowNotes}
                    onChange={(v) => updateField('allowNotes', v)}
                  />
                </Col>
                <Col md={6} className="ps-md-4 border-start">
                  <PreferenceToggle
                    id="wizardAutoSubmit"
                    label="Auto Submit on Time End"
                    description="Automatically submit the exam when time is up."
                    checked={form.autoSubmitOnTimeEnd}
                    onChange={(v) => updateField('autoSubmitOnTimeEnd', v)}
                  />
                  <PreferenceToggle
                    id="wizardConfirmBeforeSubmit"
                    label="Confirm Before Submit"
                    description="Ask students to confirm before final submission."
                    checked={form.confirmBeforeSubmit}
                    onChange={(v) => updateField('confirmBeforeSubmit', v)}
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-between mt-4">
                <Button variant="outline-secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button variant="primary" disabled={saveMutation.isPending} onClick={handleNext}>
                  {saveMutation.isPending ? 'Saving...' : 'Next: Review & Publish →'}
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm" style={{ background: '#f5f3ff' }}>
            <Card.Body>
              <div className="d-flex gap-2">
                <BulbIcon />
                <div>
                  <div className="fw-bold small mb-1" style={{ color: '#5b21b6' }}>Tip</div>
                  <div className="small" style={{ color: '#5b21b6' }}>
                    These preferences help create a smooth and fair experience for all students.
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
