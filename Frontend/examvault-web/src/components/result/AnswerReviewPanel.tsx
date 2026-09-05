import { useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import type { QuestionResultResponse } from '../../types/result';

interface AnswerReviewPanelProps {
  questions: QuestionResultResponse[];
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

// One question at a time, rather than the whole exam stacked in a list -
// mirrors how a student reviews a paper exam, one question at a time.
export default function AnswerReviewPanel({ questions }: AnswerReviewPanelProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [questions]);

  const question = questions[Math.min(index, questions.length - 1)];
  const isCodeQuestion = question.questionType === 'CodeProgram';
  const isMultiSelect = question.questionType === 'MultiSelect';
  const selectedOption = question.options.find((option) => option.optionId === question.selectedOptionId) ?? null;
  const correctOption = question.options.find((option) => option.isCorrect) ?? null;
  const selectedOptions = isMultiSelect
    ? question.options.filter((option) => question.selectedOptionIds?.includes(option.optionId))
    : [];
  const correctOptions = isMultiSelect ? question.options.filter((option) => option.isCorrect) : [];
  const wasAnswered = isCodeQuestion
    ? question.answerText !== null
    : isMultiSelect
      ? (question.selectedOptionIds?.length ?? 0) > 0
      : question.selectedOptionId !== null;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h6 fw-bold mb-0">Answer Review</h2>
          <span className="text-muted small">
            Question {index + 1} of {questions.length}
          </span>
        </div>

        <p className="fw-medium mb-4">{question.questionText}</p>

        <div className="text-muted small fw-medium mb-2">Your Answer</div>
        {isCodeQuestion ? (
          wasAnswered ? (
            <>
              <pre className="bg-body-tertiary border rounded-3 p-3 mb-2 small">{question.answerText}</pre>
              <div className="small mb-4">
                {question.isPendingGrading ? (
                  <span className="text-warning fw-medium">Pending grading</span>
                ) : (
                  <span className="text-muted">
                    Marks awarded: {question.marksAwarded} / {question.marks}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-3 p-3 mb-4 bg-body-tertiary text-muted fst-italic">Not answered</div>
          )
        ) : wasAnswered && isMultiSelect ? (
          <div className="d-flex flex-column gap-2 mb-4">
            {selectedOptions.map((option) => (
              <div
                key={option.optionId}
                className={`d-flex justify-content-between align-items-center rounded-3 p-3 ${
                  question.isCorrect
                    ? 'bg-success-subtle text-success-emphasis'
                    : 'bg-danger-subtle text-danger-emphasis'
                }`}
              >
                <span>{option.optionText}</span>
                {question.isCorrect ? <CheckIcon /> : <CrossIcon />}
              </div>
            ))}
          </div>
        ) : wasAnswered ? (
          <div
            className={`d-flex justify-content-between align-items-center rounded-3 p-3 mb-4 ${
              question.isCorrect ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'
            }`}
          >
            <span>{selectedOption?.optionText}</span>
            {question.isCorrect ? <CheckIcon /> : <CrossIcon />}
          </div>
        ) : (
          <div className="rounded-3 p-3 mb-4 bg-body-tertiary text-muted fst-italic">Not answered</div>
        )}

        {!isCodeQuestion && !question.isCorrect && isMultiSelect && correctOptions.length > 0 && (
          <>
            <div className="text-muted small fw-medium mb-2">Correct Answer</div>
            <div className="d-flex flex-column gap-2 mb-4">
              {correctOptions.map((option) => (
                <div
                  key={option.optionId}
                  className="d-flex justify-content-between align-items-center rounded-3 p-3 bg-success-subtle text-success-emphasis"
                >
                  <span>{option.optionText}</span>
                  <CheckIcon />
                </div>
              ))}
            </div>
          </>
        )}

        {!isCodeQuestion && !isMultiSelect && !question.isCorrect && correctOption && (
          <>
            <div className="text-muted small fw-medium mb-2">Correct Answer</div>
            <div className="d-flex justify-content-between align-items-center rounded-3 p-3 mb-4 bg-success-subtle text-success-emphasis">
              <span>{correctOption.optionText}</span>
              <CheckIcon />
            </div>
          </>
        )}

        <div className="d-flex justify-content-between pt-2">
          <Button
            variant="outline-secondary"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            &larr; Previous
          </Button>
          <Button
            variant="outline-secondary"
            disabled={index === questions.length - 1}
            onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
          >
            Next &rarr;
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
