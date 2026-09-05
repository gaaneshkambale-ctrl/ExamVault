import { Badge, Card, ListGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import DeleteQuestionButton from '../../components/DeleteQuestionButton';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useQuestion } from '../../hooks/useQuestions';
import type { QuestionDifficulty, QuestionType } from '../../types/question';
import { PROGRAMMING_LANGUAGES } from '../../types/question';

const difficultyVariant: Record<QuestionDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const questionTypeLabel: Record<QuestionType, string> = {
  // "MultipleChoice" is the backend's real name for this type, but its
  // actual behavior (one correct answer) is what's normally called "Single
  // Choice" - labelled that way here, matching the AI Generate pages.
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

function languageLabel(language: string | null | undefined): string {
  return PROGRAMMING_LANGUAGES.find((l) => l.value === language)?.label ?? language ?? '-';
}

export default function QuestionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: question, isLoading, isError } = useQuestion(id);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEditQuestions = user?.role !== 'Instructor' || hasPermission('Questions - Edit');

  const backTo = question
    ? question.sectionId
      ? `/admin/exams/${question.examId}/sections/${question.sectionId}/edit?step=3`
      : `/admin/exams/${question.examId}`
    : '/admin/exams';

  return (
    <RoleAwareLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Question Details</h1>
        {question && (
          <div className="d-flex align-items-center gap-3">
            {canEditQuestions && (
              <Link to={`/admin/questions/${question.id}/edit`} className="btn btn-primary">
                Edit
              </Link>
            )}
            <DeleteQuestionButton
              questionId={question.id}
              examId={question.examId}
              onDeleted={() => navigate(backTo)}
            />
            <Link to={backTo} className="btn btn-outline-secondary">
              Back
            </Link>
          </div>
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
                <div>Shuffle Options: {question.shuffleOptions ? 'Yes' : 'No'}</div>
                <div>Created: {new Date(question.createdOn).toLocaleString()}</div>
              </div>

              {question.questionType === 'CodeProgram' ? (
                <>
                  <div className="d-flex gap-4 text-muted small mb-3">
                    <div>Language: {languageLabel(question.programmingLanguage)}</div>
                    <div>Student can change language: {question.allowLanguageChange ? 'Yes' : 'No'}</div>
                  </div>
                  {question.starterCode && (
                    <>
                      <div className="text-muted small mb-2">Starter Code</div>
                      <pre className="bg-body-tertiary border rounded p-3 mb-3">{question.starterCode}</pre>
                    </>
                  )}
                  {question.sampleAnswer && (
                    <>
                      <div className="text-muted small mb-2">Sample Answer (grading reference)</div>
                      <pre className="bg-body-tertiary border rounded p-3 mb-0">{question.sampleAnswer}</pre>
                    </>
                  )}
                </>
              ) : (
                <>
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
            </>
          )}
        </Card.Body>
      </Card>
    </RoleAwareLayout>
  );
}
