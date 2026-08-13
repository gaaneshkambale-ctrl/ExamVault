import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useMyAssignmentForExam } from '../../hooks/useAssignments';
import { startAttempt } from '../../api/submissionApi';
import type { ExamType } from '../../types/exam';

function extractStartError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong starting the exam. Please try again.';
}

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={6} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: questions } = useQuestions(id);
  const { data: assignment } = useMyAssignmentForExam(id);

  // exam.totalQuestions is a legacy Phase-5 field that's never kept in sync
  // with Question Service, so it's frequently stale/wrong - the real count
  // is however many questions actually exist for this exam.
  const totalQuestions = questions?.length ?? exam?.totalQuestions ?? 0;

  const startMutation = useMutation({
    mutationFn: () => startAttempt(id!),
    onSuccess: () => {
      // Take Exam resolves the attempt itself via the mine-lookup endpoint,
      // so it doesn't need the attempt id handed through navigation state.
      navigate(`/exams/${id}/take`);
    },
  });

  return (
    <StudentLayout active="My Exams">
      <Link to="/exams" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <div className="text-center text-danger py-5">Couldn't load this exam. Please try again.</div>
      )}

      {!isLoading && !isError && exam && (
        <Row className="g-3">
          <Col xs={12} lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <h1 className="h5 fw-bold mb-2">{exam.title}</h1>
                <Badge bg="primary" className="mb-3">
                  Upcoming
                </Badge>
                <Row>
                  <Field label="Total Questions" value={String(totalQuestions)} />
                  <Field label="Duration" value={`${exam.durationMinutes} Minutes`} />
                  <Field label="Total Marks" value={String(exam.totalMarks)} />
                  <Field
                    label="Passing Marks"
                    value={`${exam.passingMarks} (${Math.round(
                      (exam.passingMarks / Math.max(exam.totalMarks, 1)) * 100,
                    )}%)`}
                  />
                  <Field label="Exam Type" value={examTypeLabel[exam.examType]} />
                  <Field
                    label="Start Date"
                    value={assignment ? new Date(assignment.startAtUtc).toLocaleString() : 'Not scheduled'}
                  />
                  <Field
                    label="End Date"
                    value={assignment ? new Date(assignment.endAtUtc).toLocaleString() : 'Not scheduled'}
                  />
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-3">Instructions</h2>
                <ol className="ps-3 mb-4">
                  <li className="mb-2">
                    The exam contains {totalQuestions} question{totalQuestions === 1 ? '' : 's'}.
                  </li>
                  <li className="mb-2">The exam carries a total of {exam.totalMarks} marks.</li>
                  <li className="mb-2">
                    {exam.negativeMarkingEnabled
                      ? `Negative marking is enabled (${exam.negativeMarks} marks per wrong answer).`
                      : 'There is no negative marking.'}
                  </li>
                  <li className="mb-2">You cannot pause or resume the exam.</li>
                  <li className="mb-2">Make sure you have a stable internet connection.</li>
                  <li className="mb-2">Do not refresh or close the browser window.</li>
                </ol>

                <Alert variant="warning" className="small">
                  You can start the exam only once. Make sure you are ready.
                </Alert>

                {startMutation.isError && (
                  <Alert variant="danger" className="small mb-3">
                    {extractStartError(startMutation.error)}
                  </Alert>
                )}

                <Button
                  variant="primary"
                  className="w-100"
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate()}
                >
                  {startMutation.isPending ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Starting...
                    </>
                  ) : (
                    'Start Exam Now'
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </StudentLayout>
  );
}
