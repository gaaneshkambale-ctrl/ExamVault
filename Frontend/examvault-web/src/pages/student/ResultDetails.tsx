import { Badge, Card, Col, ListGroup, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { useMyResult } from '../../hooks/useResults';
import type { QuestionResultResponse } from '../../types/result';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={6} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

function QuestionBreakdownItem({ question, index }: { question: QuestionResultResponse; index: number }) {
  return (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2 className="h6 fw-bold mb-0" style={{ maxWidth: 560 }}>
            {index + 1}. {question.questionText}
          </h2>
          <Badge bg={question.isCorrect ? 'success' : 'danger'}>
            {question.isCorrect ? `+${question.marksAwarded}` : '0'} / {question.marks}
          </Badge>
        </div>
        <ListGroup>
          {question.options.map((option) => {
            const isSelected = option.optionId === question.selectedOptionId;
            const variant = option.isCorrect ? 'success' : isSelected ? 'danger' : undefined;
            return (
              <ListGroup.Item
                key={option.optionId}
                className="d-flex justify-content-between align-items-center"
                variant={variant}
              >
                {option.optionText}
                <div className="d-flex gap-2">
                  {isSelected && <Badge bg={option.isCorrect ? 'success' : 'danger'}>Your Answer</Badge>}
                  {option.isCorrect && !isSelected && <Badge bg="success">Correct Answer</Badge>}
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}

export default function ResultDetails() {
  const { examId } = useParams<{ examId: string }>();
  const { data: result, isLoading, isError } = useMyResult(examId);

  const percentage =
    result && result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;

  return (
    <StudentLayout active="My Results">
      <Link to="/results" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to My Results
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (isError || !result) && (
        <div className="text-center text-muted py-5">
          No result available for this exam yet - it may not be submitted.
        </div>
      )}

      {!isLoading && result && (
        <>
          <Card className="border-0 shadow-sm mx-auto mb-4" style={{ maxWidth: 560 }}>
            <Card.Body className="p-4 text-center">
              <div
                className={`rounded-circle bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3 ${
                  result.passed ? 'bg-success text-success' : 'bg-danger text-danger'
                }`}
                style={{ width: 64, height: 64, fontSize: 32 }}
              >
                {result.passed ? '✓' : '✗'}
              </div>
              <h1 className="h5 fw-bold mb-1">{result.examTitle}</h1>
              <Badge bg={result.passed ? 'success' : 'danger'} className="mb-4">
                {result.passed ? 'Passed' : 'Failed'}
              </Badge>

              <div className="text-start border rounded-3 p-3">
                <Row>
                  <Field label="Score" value={`${result.totalScore} / ${result.totalMarks}`} />
                  <Field label="Percentage" value={`${percentage}%`} />
                  <Field label="Passing Marks" value={String(result.passingMarks)} />
                  <Field label="Submitted On" value={new Date(result.submittedAtUtc).toLocaleString()} />
                </Row>
              </div>
            </Card.Body>
          </Card>

          {result.questions && result.questions.length > 0 && (
            <div>
              <h2 className="h6 fw-bold mb-3">Answer Review</h2>
              {result.questions.map((question, index) => (
                <QuestionBreakdownItem key={question.questionId} question={question} index={index} />
              ))}
            </div>
          )}

          {!result.questions && (
            <div className="text-center text-muted small py-3">
              The correct answers for this exam aren't available to view.
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}
