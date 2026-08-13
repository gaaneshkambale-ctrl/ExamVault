import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { getMyAttempt, saveAnswer, startAttempt, submitAttempt } from '../../api/submissionApi';
import type { QuestionResponse } from '../../types/question';
import type { ExamAttemptResponse } from '../../types/submission';

type NavState = 'answered' | 'not-answered' | 'marked' | 'not-visited';
type Mode = 'loading' | 'take' | 'review' | 'submitted';

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

const statusLabel: Record<ExamAttemptResponse['status'], string> = {
  InProgress: 'In Progress',
  Submitted: 'Submitted',
  AutoSubmitted: 'Auto-Submitted',
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

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: exam, isLoading: isLoadingExam } = useExam(id);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(id);

  const [mode, setMode] = useState<Mode>('loading');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAtUtc, setAttemptStartedAtUtc] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<ExamAttemptResponse | null>(null);
  const [attemptError, setAttemptError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Resolve the attempt via the mine-lookup endpoint first: continue an
  // InProgress attempt with saved answers restored, or land straight on the
  // submitted view if it's already been submitted/auto-submitted. Falling
  // back to start() only when no attempt exists yet at all (e.g. this exam
  // was opened directly rather than through Exam Details' Start Exam Now).
  useEffect(() => {
    if (!id || attemptId) {
      return;
    }
    let cancelled = false;

    getMyAttempt(id)
      .then(async (result) => {
        if (cancelled) {
          return;
        }
        if (result) {
          setAttemptId(result.attempt.id);
          setAttemptStartedAtUtc(result.attempt.startedAtUtc);
          if (result.attempt.status !== 'InProgress') {
            setSubmittedAttempt(result.attempt);
            setMode('submitted');
            return;
          }
          const restored: Record<string, AnswerState> = {};
          const visitedIds = new Set<string>();
          for (const answer of result.answers) {
            restored[answer.questionId] = {
              selectedOptionId: answer.selectedOptionId,
              isMarkedForReview: answer.isMarkedForReview,
            };
            visitedIds.add(answer.questionId);
          }
          setAnswers(restored);
          setVisited(visitedIds);
          setMode('take');
          return;
        }

        const attempt = await startAttempt(id);
        if (cancelled) {
          return;
        }
        setAttemptId(attempt.id);
        setAttemptStartedAtUtc(attempt.startedAtUtc);
        setMode('take');
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAttemptError(extractError(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, attemptId]);

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
    if (mode !== 'take') {
      return;
    }
    const question = displayQuestions[currentIndex];
    if (question) {
      setVisited((prev) => new Set(prev).add(question.id));
    }
  }, [mode, displayQuestions, currentIndex]);

  const submitMutation = useMutation({
    mutationFn: (isAutoSubmitted: boolean) => submitAttempt(attemptId!, isAutoSubmitted),
    onSuccess: (attempt) => {
      setSubmittedAttempt(attempt);
      setMode('submitted');
      void queryClient.invalidateQueries({ queryKey: ['submissions', 'mine', id] });
    },
    onError: (error) => setAttemptError(extractError(error)),
  });

  const { mutate: runSubmit } = submitMutation;

  // Countdown timer: exam.durationMinutes from Phase 5 + the attempt's real
  // StartedAtUtc. Auto-submits once when it reaches zero.
  useEffect(() => {
    if (mode !== 'take' || !attemptStartedAtUtc || !exam) {
      return;
    }
    const endTime = new Date(attemptStartedAtUtc).getTime() + exam.durationMinutes * 60_000;
    let intervalId: ReturnType<typeof setInterval>;
    let hasAutoSubmitted = false;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0 && !hasAutoSubmitted) {
        hasAutoSubmitted = true;
        clearInterval(intervalId);
        runSubmit(true);
      }
    };

    tick();
    intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [mode, attemptStartedAtUtc, exam, runSubmit]);

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
    setMode('take');
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

  const isLoading = mode === 'loading' || isLoadingExam || isLoadingQuestions;
  const currentQuestion = displayQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? { selectedOptionId: null, isMarkedForReview: false })
    : null;

  const answeredCount = displayQuestions.filter((q) => answers[q.id]?.selectedOptionId).length;
  const markedCount = displayQuestions.filter((q) => answers[q.id]?.isMarkedForReview).length;
  const notAnsweredCount = displayQuestions.length - answeredCount;

  const questionNavigator = (
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
              style={{ width: 34, height: 34, ...navStateStyle[navState(question)] }}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="d-flex flex-column gap-2">
          {NAV_LEGEND.map((item) => (
            <div key={item.state} className="d-flex align-items-center gap-2 small">
              <span className="rounded-1 border flex-shrink-0" style={{ width: 14, height: 14, background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <StudentLayout active="My Exams">
      {mode !== 'submitted' && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h5 fw-bold mb-0">
              {isLoadingExam ? <Spinner animation="border" size="sm" /> : (exam?.title ?? 'Take Exam')}
            </h1>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-center">
              <div className="text-muted small">Time Left</div>
              <div className="fw-bold">
                {remainingSeconds !== null ? formatDuration(remainingSeconds) : '--:--:--'}
              </div>
            </div>
            <Button
              variant="danger"
              disabled={mode === 'loading' || submitMutation.isPending}
              onClick={() => (mode === 'review' ? submitMutation.mutate(false) : setMode('review'))}
            >
              Submit Exam
            </Button>
          </div>
        </div>
      )}

      {attemptError && <Alert variant="danger">{attemptError}</Alert>}

      {isLoading && !attemptError && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && !attemptError && mode !== 'submitted' && displayQuestions.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            This exam doesn't have any questions yet.
          </Card.Body>
        </Card>
      )}

      {!isLoading && !attemptError && mode === 'take' && currentQuestion && currentAnswer && (
        <Row className="g-3">
          <Col xs={12} lg={3}>
            {questionNavigator}
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
                    onChange={(e) => updateAnswer(currentQuestion.id, { isMarkedForReview: e.target.checked })}
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

      {!isLoading && !attemptError && mode === 'review' && (
        <Row className="g-3">
          <Col xs={12} lg={3}>
            {questionNavigator}
          </Col>

          <Col xs={12} lg={9}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-3">Review Summary</h2>
                <Row className="g-3 mb-4">
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Total Questions</div>
                    <div className="h4 fw-bold mb-0">{displayQuestions.length}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Answered</div>
                    <div className="h4 fw-bold mb-0 text-success">{answeredCount}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Not Answered</div>
                    <div className="h4 fw-bold mb-0 text-danger">{notAnsweredCount}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Marked for Review</div>
                    <div className="h4 fw-bold mb-0 text-warning">{markedCount}</div>
                  </Col>
                </Row>

                <Alert variant="light" className="border small">
                  Please review all the questions marked for review before submitting.
                </Alert>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={() => setMode('take')}>
                    &larr; Back to Exam
                  </Button>
                  <Button
                    variant="primary"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate(false)}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Exam'
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {mode === 'submitted' && submittedAttempt && (
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 480 }}>
          <Card.Body className="text-center p-5">
            <div
              className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64 }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="h5 fw-bold mb-1">Exam Submitted Successfully!</h1>
            <p className="text-muted mb-4">Thank you for completing the exam.</p>

            <Card className="border-0 bg-light text-start mb-4">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">{exam?.title ?? 'Exam'}</h2>
                <Row className="g-2">
                  <Col xs={6} className="text-muted small">Total Questions</Col>
                  <Col xs={6} className="fw-medium">{displayQuestions.length || exam?.totalQuestions || 0}</Col>
                  <Col xs={6} className="text-muted small">Submitted On</Col>
                  <Col xs={6} className="fw-medium">
                    {submittedAttempt.submittedAtUtc
                      ? new Date(submittedAttempt.submittedAtUtc).toLocaleString()
                      : '—'}
                  </Col>
                  <Col xs={6} className="text-muted small">Status</Col>
                  <Col xs={6}>
                    <Badge bg="success">{statusLabel[submittedAttempt.status]}</Badge>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Button variant="primary" className="w-100" onClick={() => navigate('/exams')}>
              Go to My Exams
            </Button>
          </Card.Body>
        </Card>
      )}
    </StudentLayout>
  );
}
