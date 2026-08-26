import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import ExamWizardStepper from '../../components/ExamWizardStepper';
import { publishExam } from '../../api/examApi';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useSections } from '../../hooks/useSections';
import { extractServerError } from '../../utils/apiError';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function ExamWizardReview() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exam, isLoading } = useExam(examId);
  const { data: questions } = useQuestions(examId);
  const { data: sections } = useSections(examId, Boolean(exam?.containsSections));
  const [error, setError] = useState('');

  const totalQuestions = questions?.length ?? 0;

  const sectionTotals = (sections ?? []).reduce(
    (acc, s) => ({ marks: acc.marks + s.marks, durationMinutes: acc.durationMinutes + s.durationMinutes }),
    { marks: 0, durationMinutes: 0 },
  );
  const hasSections = Boolean(exam?.containsSections) && (sections?.length ?? 0) > 0;
  const marksMismatch = hasSections && exam && sectionTotals.marks !== exam.totalMarks;
  const durationMismatch = hasSections && exam && sectionTotals.durationMinutes !== exam.durationMinutes;
  const passingMarksUnreachable = hasSections && exam && exam.passingMarks > sectionTotals.marks;
  const showMismatchWarning = marksMismatch || durationMismatch || passingMarksUnreachable;

  const publishMutation = useMutation({
    mutationFn: () => publishExam(examId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      navigate(`/admin/exams/${examId}`);
    },
    onError: (err) => setError(extractServerError(err)),
  });

  return (
    <AdminLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">Create Exam / {exam?.title ?? '...'}</p>
        <h1 className="h4 fw-bold mb-2 text-primary">Review &amp; Publish</h1>
      </div>

      <ExamWizardStepper currentStep={4} containsSections={Boolean(exam?.containsSections)} />

      {error && <Alert variant="danger">{error}</Alert>}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {exam && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-3">Exam Summary</h2>
              <Row>
                <Field label="Exam Name" value={exam.title} />
                <Field label="Category" value={exam.category || 'Uncategorized'} />
                <Field label="Exam Type" value={exam.examTypeName || 'Not set'} />
                <Field label="Creation Method" value={exam.creationMethod} />
                <Field label="Total Questions" value={String(totalQuestions)} />
                <Field label="Total Marks" value={String(exam.totalMarks)} />
                <Field label="Passing Marks" value={String(exam.passingMarks)} />
                <Field label="Duration" value={`${exam.durationMinutes} minutes`} />
                <Field label="Max Attempts" value={String(exam.maxAttempts)} />
              </Row>
            </Card.Body>
          </Card>

          {showMismatchWarning && (
            <Alert variant="warning">
              <Alert.Heading className="h6 fw-bold">Section totals don't match the exam's settings</Alert.Heading>
              <ul className="mb-0 small">
                {marksMismatch && (
                  <li>
                    Sections add up to {sectionTotals.marks} marks, but Total Marks above is {exam.totalMarks}.
                  </li>
                )}
                {durationMismatch && (
                  <li>
                    Sections add up to {sectionTotals.durationMinutes} minute(s), but Duration above is{' '}
                    {exam.durationMinutes} minute(s).
                  </li>
                )}
                {passingMarksUnreachable && (
                  <li>
                    Passing Marks is {exam.passingMarks}, but sections only add up to {sectionTotals.marks}{' '}
                    marks - this exam can never be passed.
                  </li>
                )}
              </ul>
              <div className="small mt-2 mb-0">Publishing will be blocked until these match.</div>
            </Alert>
          )}

          {exam.containsSections && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-3">Sections Summary</h2>
                {(sections?.length ?? 0) === 0 ? (
                  <div className="text-muted small">No sections added yet.</div>
                ) : (
                  <Table responsive className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase table-light">
                      <tr>
                        <th>Section Name</th>
                        <th>Questions</th>
                        <th>Marks</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections!.map((section) => (
                        <tr key={section.id}>
                          <td>{section.name}</td>
                          <td>{section.questionCount}</td>
                          <td>{section.marks}</td>
                          <td>{section.durationMinutes} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-between">
            <Button
              variant="outline-secondary"
              onClick={() => navigate(`/admin/exams/${examId}/wizard/configuration`)}
            >
              Back
            </Button>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')}>
                Save as Draft
              </Button>
              <Button
                variant="success"
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish Exam'}
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
