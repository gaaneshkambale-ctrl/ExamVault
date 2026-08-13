import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { archiveExam, publishExam, unpublishExam } from '../../api/examApi';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import type { ExamStatus, ExamType } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

function extractServerError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 409) {
    return 'That status change is not allowed from the exam’s current state.';
  }
  return 'Something went wrong. Please try again.';
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: questions } = useQuestions(id);
  const [statusError, setStatusError] = useState('');

  // exam.totalQuestions is a legacy field that's never kept in sync with
  // Question Service, so it's always 0 - use the real live count instead.
  const totalQuestions = questions?.length ?? exam?.totalQuestions ?? 0;

  const invalidateExam = () => {
    queryClient.invalidateQueries({ queryKey: ['exams'] });
    queryClient.invalidateQueries({ queryKey: ['exams', id] });
  };

  const publishMutation = useMutation({
    mutationFn: () => publishExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const anyStatusActionPending =
    publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending;

  return (
    <AdminLayout active="Exam Review & Publish">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Exam Review &amp; Publish</h1>
        <div className="d-flex gap-2">
          {id && exam && (
            exam.status === 'Published' ? (
              <Link to={`/admin/assignments/new?examId=${id}`} className="btn btn-outline-primary">
                Assign Students
              </Link>
            ) : (
              <span title="Publish this exam before assigning it to students.">
                <Button variant="outline-primary" disabled>
                  Assign Students
                </Button>
              </span>
            )
          )}
          {id && (
            <Link to={`/admin/exams/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
          )}
          <Link to="/admin/exams" className="btn btn-outline-secondary">
            Back to Exams
          </Link>
        </div>
      </div>

      {statusError && <Alert variant="danger">{statusError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this exam. It may not exist.
            </div>
          )}

          {exam && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h2 className="h5 fw-bold mb-1">{exam.title}</h2>
                  <p className="text-muted mb-0">{exam.description || 'No description.'}</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg={statusVariant[exam.status]} className="fs-6">
                    {exam.status}
                  </Badge>
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

              <Row>
                <Field label="Exam Type" value={examTypeLabel[exam.examType]} />
                <Field label="Duration" value={`${exam.durationMinutes} minutes`} />
                <Field label="Total Marks" value={String(exam.totalMarks)} />
                <Field label="Passing Marks" value={String(exam.passingMarks)} />
                <Field label="Total Questions" value={String(totalQuestions)} />
                <Field
                  label="Created On"
                  value={new Date(exam.createdOn).toLocaleString()}
                />
              </Row>

              <div className="text-muted small mb-1">Instructions</div>
              <div>{exam.instructions || 'No instructions provided.'}</div>
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
