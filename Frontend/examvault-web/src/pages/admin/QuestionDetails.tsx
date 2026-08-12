import { Badge, Card, ListGroup, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useQuestion } from '../../hooks/useQuestions';
import type { QuestionDifficulty, QuestionType } from '../../types/question';

const difficultyVariant: Record<QuestionDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const questionTypeLabel: Record<QuestionType, string> = {
  MultipleChoice: 'Multiple Choice',
  TrueFalse: 'True/False',
};

export default function QuestionDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: question, isLoading, isError } = useQuestion(id);

  return (
    <AdminLayout active="Questions">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Question Details</h1>
        {question && (
          <Link to={`/admin/exams/${question.examId}/edit`} className="btn btn-outline-secondary">
            Back to Exam
          </Link>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this question. It may not exist.
            </div>
          )}

          {question && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <h2 className="h5 fw-bold mb-0" style={{ maxWidth: 560 }}>
                  {question.questionText}
                </h2>
                <Badge bg={difficultyVariant[question.difficulty]}>{question.difficulty}</Badge>
              </div>

              <div className="d-flex gap-4 text-muted small mb-4">
                <div>Type: {questionTypeLabel[question.questionType]}</div>
                <div>Marks: {question.marks}</div>
                <div>Created: {new Date(question.createdOn).toLocaleString()}</div>
              </div>

              <div className="text-muted small mb-2">Options</div>
              <ListGroup>
                {question.options.map((option) => (
                  <ListGroup.Item
                    key={option.id}
                    className="d-flex justify-content-between align-items-center"
                    variant={option.isCorrect ? 'success' : undefined}
                  >
                    {option.optionText}
                    {option.isCorrect && <Badge bg="success">Correct</Badge>}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
