import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import type { ExamType } from '../../types/exam';

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
  const { data: exam, isLoading, isError } = useExam(id);
  const [showStartInfo, setShowStartInfo] = useState(false);

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
                  <Field label="Total Questions" value={String(exam.totalQuestions)} />
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
                    value={exam.startAtUtc ? new Date(exam.startAtUtc).toLocaleString() : 'Not scheduled'}
                  />
                  <Field
                    label="End Date"
                    value={exam.endAtUtc ? new Date(exam.endAtUtc).toLocaleString() : 'Not scheduled'}
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
                    The exam contains {exam.totalQuestions} question{exam.totalQuestions === 1 ? '' : 's'}.
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

                {showStartInfo && (
                  <Alert variant="info" className="small mb-3">
                    Starting an exam isn't connected yet — that's Day 32's job.
                  </Alert>
                )}

                <Button variant="primary" className="w-100" onClick={() => setShowStartInfo(true)}>
                  Start Exam Now
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </StudentLayout>
  );
}
