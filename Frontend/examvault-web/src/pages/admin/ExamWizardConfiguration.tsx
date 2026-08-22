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
        <h1 className="h4 fw-bold mb-2 text-primary">Exam Configuration</h1>
      </div>

      <ExamWizardStepper currentStep={3} containsSections={Boolean(exam?.containsSections)} />

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {form && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <p className="text-muted small mb-3">
              Additional preferences for the student experience during this exam.
            </p>
            <Row>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="wizardShowSectionSummary"
                  className="mb-3"
                  label="Show Section Summary to Students"
                  checked={form.showSectionSummaryToStudents}
                  onChange={(e) => updateField('showSectionSummaryToStudents', e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  id="wizardAllowCalculator"
                  className="mb-3"
                  label="Allow Calculator"
                  checked={form.allowCalculator}
                  onChange={(e) => updateField('allowCalculator', e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  id="wizardAllowNotes"
                  className="mb-3"
                  label="Allow Notes"
                  checked={form.allowNotes}
                  onChange={(e) => updateField('allowNotes', e.target.checked)}
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="wizardAutoSubmit"
                  className="mb-3"
                  label="Auto Submit on Time End"
                  checked={form.autoSubmitOnTimeEnd}
                  onChange={(e) => updateField('autoSubmitOnTimeEnd', e.target.checked)}
                />
                <Form.Check
                  type="switch"
                  id="wizardConfirmBeforeSubmit"
                  className="mb-3"
                  label="Confirm Before Submit"
                  checked={form.confirmBeforeSubmit}
                  onChange={(e) => updateField('confirmBeforeSubmit', e.target.checked)}
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-2">
              <Button variant="outline-secondary" onClick={handleBack}>
                Back
              </Button>
              <Button variant="primary" disabled={saveMutation.isPending} onClick={handleNext}>
                {saveMutation.isPending ? 'Saving...' : 'Next: Review & Publish'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}
