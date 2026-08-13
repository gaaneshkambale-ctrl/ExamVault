import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useLocation, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { startAttempt, saveAnswer } from '../../api/submissionApi';
import type { QuestionResponse } from '../../types/question';

type NavState = 'answered' | 'not-answered' | 'marked' | 'not-visited';

const NAV_LEGEND: Array<{ state: NavState; label: string; color: string }> = [
  { state: 'answered', label: 'Answered', color: '#16a34a' },
  { state: 'not-answered', label: 'Not Answered', color: '#dc3545' },
  { state: 'marked', label: 'Marked for Review', color: '#f59e0b' },
  { state: 'not-visited', label: 'Not Visited', color: '#e5e7eb' },
];

const navStateStyle: Record<NavState, { background: string; color: string }> = {
  answered: { background: '#16a34a', color: 'white' },
  'not-answered': { background: 'white', color: '#212529' },
  marked: { background: '#f59e0b', color: 'white' },
  'not-visited': { background: '#e5e7eb', color: '#6c757d' },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface AnswerState {
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function extractError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

export default function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateAttemptId = (location.state as { attemptId?: string } | null)?.attemptId;

  const { data: exam, isLoading: isLoadingExam } = useExam(id);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(id);

  const [attemptId, setAttemptId] = useState<string | null>(stateAttemptId ?? null);
  const [attemptError, setAttemptError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showSubmitInfo, setShowSubmitInfo] = useState(false);

  // Accidental-refresh / direct-navigation fallback: the start endpoint is
  // idempotent (returns the existing InProgress attempt), so it's safe to
  // call again here if we didn't arrive with an attemptId already in hand.
  useEffect(() => {
    if (attemptId || !id) {
      return;
    }
    startAttempt(id)
      .then((attempt) => setAttemptId(attempt.id))
      .catch((error: unknown) => setAttemptError(extractError(error)));
  }, [attemptId, id]);

  const displayQuestions = useMemo<QuestionResponse[]>(() => {
    if (!questions) {
      return [];
    }
    const ordered = exam?.shuffleQuestions ? shuffle(questions) : questions;
    if (!exam?.shuffleOptions) {
      return ordered;
    }
    return ordered.map((q) => ({ ...q, options: shuffle(q.options) }));
    // Deliberately keyed on the shuffle flags rather than the whole `exam`
    // object, so the layout doesn't reshuffle on unrelated exam refetches.
  }, [questions, exam?.shuffleQuestions, exam?.shuffleOptions]);

  useEffect(() => {
    const question = displayQuestions[currentIndex];
    if (question) {
      setVisited((prev) => new Set(prev).add(question.id));
    }
  }, [displayQuestions, currentIndex]);

  const saveAnswerMutation = useMutation({
    mutationFn: (payload: { questionId: string; answer: AnswerState }) =>
      saveAnswer(attemptId!, {
        questionId: payload.questionId,
        selectedOptionId: payload.answer.selectedOptionId,
        isMarkedForReview: payload.answer.isMarkedForReview,
      }),
  });

  const persistAnswer = (questionId: string, answer: AnswerState) => {
    if (!attemptId) {
      return;
    }
    saveAnswerMutation.mutate({ questionId, answer });
  };

  const updateAnswer = (questionId: string, updates: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const merged: AnswerState = {
        selectedOptionId: prev[questionId]?.selectedOptionId ?? null,
        isMarkedForReview: prev[questionId]?.isMarkedForReview ?? false,
        ...updates,
      };
      persistAnswer(questionId, merged);
      return { ...prev, [questionId]: merged };
    });
  };

  const goToIndex = (index: number) => {
    const current = displayQuestions[currentIndex];
    if (current) {
      persistAnswer(current.id, answers[current.id] ?? { selectedOptionId: null, isMarkedForReview: false });
    }
    setCurrentIndex(index);
  };

  const navState = (question: QuestionResponse): NavState => {
    const answer = answers[question.id];
    if (answer?.isMarkedForReview) {
      return 'marked';
    }
    if (answer?.selectedOptionId) {
      return 'answered';
    }
    if (visited.has(question.id)) {
      return 'not-answered';
    }
    return 'not-visited';
  };

  const isLoading = isLoadingExam || isLoadingQuestions || (!attemptId && !attemptError);
  const currentQuestion = displayQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? { selectedOptionId: null, isMarkedForReview: false })
    : null;

  return (
    <StudentLayout active="My Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h5 fw-bold mb-0">
            {isLoadingExam ? <Spinner animation="border" size="sm" /> : (exam?.title ?? 'Take Exam')}
          </h1>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-center">
            <div className="text-muted small">Time Left</div>
            <div className="fw-bold">00:{String(exam?.durationMinutes ?? 0).padStart(2, '0')}:00</div>
          </div>
          <Button variant="danger" onClick={() => setShowSubmitInfo(true)}>
            Submit Exam
          </Button>
        </div>
      </div>

      {attemptError && <Alert variant="danger">{attemptError}</Alert>}

      {showSubmitInfo && (
        <Alert variant="info" onClose={() => setShowSubmitInfo(false)} dismissible>
          Submitting isn't connected yet — that's Day 33's job.
        </Alert>
      )}

      {isLoading && !attemptError && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && !attemptError && displayQuestions.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            This exam doesn't have any questions yet.
          </Card.Body>
        </Card>
      )}

      {!isLoading && !attemptError && currentQuestion && currentAnswer && (
        <Row className="g-3">
          <Col xs={12} lg={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">Question Navigator</h2>
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {displayQuestions.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => goToIndex(index)}
                      className="border rounded-2 fw-medium"
                      style={{
                        width: 34,
                        height: 34,
                        ...navStateStyle[navState(question)],
                      }}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <div className="d-flex flex-column gap-2">
                  {NAV_LEGEND.map((item) => (
                    <div key={item.state} className="d-flex align-items-center gap-2 small">
                      <span
                        className="rounded-1 border flex-shrink-0"
                        style={{ width: 14, height: 14, background: item.color }}
                      />
                      {item.label}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={9}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small">
                    Question {currentIndex + 1} of {displayQuestions.length}
                  </span>
                  <Form.Check
                    type="checkbox"
                    label="Mark for Review"
                    checked={currentAnswer.isMarkedForReview}
                    onChange={(e) =>
                      updateAnswer(currentQuestion.id, { isMarkedForReview: e.target.checked })
                    }
                  />
                </div>

                <p className="fw-medium mb-4">{currentQuestion.questionText}</p>

                <Form>
                  {currentQuestion.options.map((option, index) => (
                    <Form.Check
                      key={option.id}
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      id={`option-${option.id}`}
                      label={`${OPTION_LETTERS[index] ?? index + 1}: ${option.optionText}`}
                      checked={currentAnswer.selectedOptionId === option.id}
                      onChange={() => updateAnswer(currentQuestion.id, { selectedOptionId: option.id })}
                      className="mb-2"
                    />
                  ))}
                </Form>

                <div className="d-flex justify-content-between mt-4">
                  <Button
                    variant="outline-secondary"
                    disabled={currentIndex === 0}
                    onClick={() => goToIndex(Math.max(0, currentIndex - 1))}
                  >
                    &larr; Previous
                  </Button>
                  <Button
                    variant="primary"
                    disabled={currentIndex === displayQuestions.length - 1}
                    onClick={() => goToIndex(Math.min(displayQuestions.length - 1, currentIndex + 1))}
                  >
                    Next &rarr;
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </StudentLayout>
  );
}
