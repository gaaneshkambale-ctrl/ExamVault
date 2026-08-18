import { Badge, Button, Card, Col, ListGroup, ProgressBar, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useMyResult } from '../../hooks/useResults';
import { getGrade } from '../../types/result';
import type { QuestionResultResponse } from '../../types/result';
import type { ExamType } from '../../types/exam';
import { generateResultPdf } from '../../utils/generateResultPdf';

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

function AnalysisRow({ label, count, total, variant }: { label: string; count: number; total: number; variant: string }) {
  return (
    <div>
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">{label}</span>
        <span className="fw-medium">{count}</span>
      </div>
      <ProgressBar now={total > 0 ? (count / total) * 100 : 0} variant={variant} style={{ height: 8 }} />
    </div>
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
  const { data: exam } = useExam(examId);

  const percentage =
    result && result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = result ? getGrade(result.totalScore, result.totalMarks, result.passed) : null;

  const questions = result?.questions ?? null;
  const totalQuestions = questions?.length ?? 0;
  const correctCount = questions?.filter((q) => q.isCorrect).length ?? 0;
  const incorrectCount = questions?.filter((q) => q.selectedOptionId !== null && !q.isCorrect).length ?? 0;
  const unattemptedCount = questions?.filter((q) => q.selectedOptionId === null).length ?? 0;

  return (
    <StudentLayout active="My Results">
      <Link to="/results" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Results
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center text-danger py-5">Couldn't load your result. Please try again.</div>
      )}

      {!isLoading && !isError && !result && (
        <div className="text-center text-muted py-5">
          No result available for this exam yet - it may not be submitted.
        </div>
      )}

      {!isLoading && result && (
        <>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body className="p-4">
              <h1 className="h5 fw-bold mb-1">{result.examTitle}</h1>
              <p className="text-muted small mb-0">
                {exam ? `${examTypeLabel[exam.examType]} · ` : ''}
                Completed on {new Date(result.submittedAtUtc).toLocaleString()}
              </p>
            </Card.Body>
          </Card>

          <Row className="g-3 mb-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="text-muted small mb-2">Your Score</div>
                  <div className="d-flex align-items-baseline gap-2 mb-2">
                    <span className="display-6 fw-bold">{result.totalScore}</span>
                    <span className="text-muted h5 mb-0">/ {result.totalMarks}</span>
                  </div>
                  <div className="d-flex align-items-center flex-wrap gap-3">
                    <span className="h4 fw-bold text-success mb-0">{percentage}%</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Grade:</span>
                      {grade && <Badge bg={gradeVariant[grade]}>{grade}</Badge>}
                    </div>
                    <Badge bg={result.passed ? 'success' : 'danger'}>
                      {result.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="fw-bold mb-3">Performance Analysis</div>
                  {questions ? (
                    <div className="d-flex flex-column gap-3">
                      <AnalysisRow
                        label="Correct Answers"
                        count={correctCount}
                        total={totalQuestions}
                        variant="success"
                      />
                      <AnalysisRow
                        label="Incorrect Answers"
                        count={incorrectCount}
                        total={totalQuestions}
                        variant="danger"
                      />
                      <AnalysisRow
                        label="Unattempted"
                        count={unattemptedCount}
                        total={totalQuestions}
                        variant="secondary"
                      />
                    </div>
                  ) : (
                    <div className="text-muted small">Not available for this exam.</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {questions && questions.length > 0 && (
            <div>
              <h2 className="h6 fw-bold mb-3">Answer Review</h2>
              {questions.map((question, index) => (
                <QuestionBreakdownItem key={question.questionId} question={question} index={index} />
              ))}
            </div>
          )}

          {!questions && (
            <div className="text-center text-muted small py-3">
              The correct answers for this exam aren't available to view.
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            <Button variant="primary" onClick={() => generateResultPdf(result)}>
              Download Result
            </Button>
          </div>
        </>
      )}
    </StudentLayout>
  );
}
