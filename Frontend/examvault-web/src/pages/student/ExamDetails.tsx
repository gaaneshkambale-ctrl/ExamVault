import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useSections } from '../../hooks/useSections';
import { useMyAssignmentForExam } from '../../hooks/useAssignments';
import { useMyAttempt } from '../../hooks/useSubmissions';
import { usePermissions } from '../../hooks/usePermissions';
import { startAttempt } from '../../api/submissionApi';
import { getAssignmentStatus } from '../../types/assignment';
import type { CreationMethod } from '../../types/exam';

function extractStartError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong starting the exam. Please try again.';
}

const creationMethodLabel: Record<CreationMethod, string> = {
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

type CheckStatus = 'checking' | 'good' | 'bad';
type CheckKey = 'internet' | 'browser' | 'screen' | 'camera' | 'microphone' | 'fullscreen';

const CHECK_ITEMS: Array<{ key: CheckKey; label: string; goodLabel: string; badLabel: string }> = [
  { key: 'internet', label: 'Internet Connection', goodLabel: 'Good', badLabel: 'Offline' },
  { key: 'browser', label: 'Browser Compatibility', goodLabel: 'Good', badLabel: 'Not Supported' },
  { key: 'screen', label: 'Screen Resolution', goodLabel: 'Good', badLabel: 'Too Small' },
  { key: 'camera', label: 'Camera', goodLabel: 'Detected', badLabel: 'Not Detected' },
  { key: 'microphone', label: 'Microphone', goodLabel: 'Detected', badLabel: 'Not Detected' },
  { key: 'fullscreen', label: 'Fullscreen Mode', goodLabel: 'Ready', badLabel: 'Not Supported' },
];

const MIN_SCREEN_WIDTH = 1024;
const MIN_SCREEN_HEIGHT = 600;
const MEDIA_CHECK_TIMEOUT_MS = 15_000;

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === 'checking') {
    return <Spinner animation="border" size="sm" />;
  }
  if (status === 'good') {
    return (
      <span
        className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 22, height: 22 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="rounded-circle bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: 22, height: 22 }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: questions } = useQuestions(id);
  const { data: sections } = useSections(id, Boolean(exam?.containsSections));
  const { data: assignment } = useMyAssignmentForExam(id);
  const { data: myAttempt } = useMyAttempt(id);
  const { hasPermission } = usePermissions();
  const canViewResults = hasPermission('Results - View');

  const attemptsUsed = myAttempt?.attempt.attemptNumber ?? 0;
  const isAttemptInProgress = myAttempt?.attempt.status === 'InProgress';
  // The assignment's own attempt limit (set per-assignment in the Assign Exam
  // wizard) overrides the exam's default - matches StartAttemptHandler's
  // `assignment?.MaxAttempts ?? exam.MaxAttempts` fallback on the backend.
  const maxAttempts = assignment?.maxAttempts ?? exam?.maxAttempts ?? 0;
  const remainingAttempts = exam ? maxAttempts - attemptsUsed : 0;
  const canStartNewAttempt = remainingAttempts > 0;
  // No assignment window at all means nothing to wait for - it's available now.
  const isBeforeStart =
    attemptsUsed === 0 &&
    !isAttemptInProgress &&
    !!assignment &&
    getAssignmentStatus(assignment.startAtUtc, assignment.endAtUtc) === 'Upcoming';

  const [mode, setMode] = useState<'details' | 'check'>('details');
  const [checks, setChecks] = useState<Record<CheckKey, CheckStatus>>({
    internet: 'checking',
    browser: 'checking',
    screen: 'checking',
    camera: 'checking',
    microphone: 'checking',
    fullscreen: 'checking',
  });
  const [agreedToRules, setAgreedToRules] = useState(false);

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

  // Best-effort: enter fullscreen right as the exam begins. Browsers only
  // grant requestFullscreen() while still inside the user-gesture callback
  // that triggered it - calling it from the mutation's onSuccess (after an
  // awaited network round-trip) loses that gesture and silently no-ops, so
  // this must run synchronously in the button's own onClick instead. Also
  // silently ignores devices/browsers that don't support it at all - never
  // block starting the exam on this.
  const requestFullscreenFromGesture = () => {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const runSystemCheck = () => {
    setChecks({
      internet: 'checking',
      browser: 'checking',
      screen: 'checking',
      camera: 'checking',
      microphone: 'checking',
      fullscreen: 'checking',
    });

    setChecks((prev) => ({ ...prev, internet: navigator.onLine ? 'good' : 'bad' }));

    const browserOk = 'fetch' in window && typeof Storage !== 'undefined';
    setChecks((prev) => ({ ...prev, browser: browserOk ? 'good' : 'bad' }));

    const screenOk = window.screen.width >= MIN_SCREEN_WIDTH && window.screen.height >= MIN_SCREEN_HEIGHT;
    setChecks((prev) => ({ ...prev, screen: screenOk ? 'good' : 'bad' }));

    setChecks((prev) => ({ ...prev, fullscreen: document.fullscreenEnabled ? 'good' : 'bad' }));

    if (!navigator.mediaDevices?.getUserMedia) {
      setChecks((prev) => ({ ...prev, camera: 'bad', microphone: 'bad' }));
      return;
    }
    // The permission prompt itself has no guaranteed response time, and on
    // some browser/OS combinations a dismissed-without-choosing prompt never
    // rejects the promise at all - without a timeout this would leave the
    // checklist stuck on "Checking..." forever instead of failing visibly.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setChecks((prev) => ({ ...prev, camera: 'bad', microphone: 'bad' }));
    }, MEDIA_CHECK_TIMEOUT_MS);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        clearTimeout(timeoutId);
        const hasVideo = stream.getVideoTracks().length > 0;
        const hasAudio = stream.getAudioTracks().length > 0;
        stream.getTracks().forEach((track) => track.stop());
        // The permission prompt was answered after the timeout already
        // marked the checks failed - stop the now-unwanted stream instead
        // of flipping the checklist back to a stale "good" and leaving the
        // camera/mic silently live.
        if (timedOut) {
          return;
        }
        setChecks((prev) => ({ ...prev, camera: hasVideo ? 'good' : 'bad', microphone: hasAudio ? 'good' : 'bad' }));
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          setChecks((prev) => ({ ...prev, camera: 'bad', microphone: 'bad' }));
        }
      });
  };

  const beginSystemCheck = () => {
    setMode('check');
    runSystemCheck();
  };

  const isStillChecking = Object.values(checks).some((status) => status === 'checking');

  return (
    <StudentLayout active="My Exams">
      <Link
        to={mode === 'check' ? '#' : '/exams'}
        onClick={(e) => {
          if (mode === 'check') {
            e.preventDefault();
            setMode('details');
          }
        }}
        className="text-decoration-none small d-inline-block mb-3"
      >
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

      {!isLoading && !isError && exam && mode === 'details' && (
        <Row className="g-3">
          <Col xs={12} lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <h1 className="h5 fw-bold mb-2">{exam.title}</h1>
                <Badge
                  bg={
                    isAttemptInProgress
                      ? 'warning'
                      : attemptsUsed === 0
                        ? isBeforeStart
                          ? 'primary'
                          : 'info'
                        : canStartNewAttempt
                          ? 'info'
                          : 'success'
                  }
                  className="mb-3"
                >
                  {isAttemptInProgress
                    ? 'In Progress'
                    : attemptsUsed === 0
                      ? isBeforeStart
                        ? 'Upcoming'
                        : 'Live'
                      : canStartNewAttempt
                        ? 'Retake Available'
                        : 'Completed'}
                </Badge>
                <Row>
                  {exam.containsSections && (
                    <Field label="Sections" value={String(sections?.length ?? 0)} />
                  )}
                  <Field label="Total Questions" value={String(totalQuestions)} />
                  <Field label="Duration" value={`${exam.durationMinutes} Minutes`} />
                  <Field label="Total Marks" value={String(exam.totalMarks)} />
                  <Field
                    label="Passing Marks"
                    value={`${exam.passingMarks} (${Math.round(
                      (exam.passingMarks / Math.max(exam.totalMarks, 1)) * 100,
                    )}%)`}
                  />
                  <Field label="Exam Type" value={exam.examTypeName || 'Not set'} />
                  <Field label="Creation Method" value={creationMethodLabel[exam.creationMethod]} />
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
                  {exam.containsSections && sections && sections.length > 0 && (
                    <li className="mb-2">
                      This exam is organized into {sections.length} section{sections.length === 1 ? '' : 's'}.
                      Some sections may have their own time limit and navigation rules (e.g. no going
                      back once you move on).
                    </li>
                  )}
                  <li className="mb-2">
                    {exam.negativeMarkingEnabled
                      ? `Negative marking is enabled (${exam.negativeMarks} marks per wrong answer).`
                      : 'There is no negative marking.'}
                  </li>
                  <li className="mb-2">You cannot pause or resume the exam.</li>
                  <li className="mb-2">Make sure you have a stable internet connection.</li>
                  <li className="mb-2">Do not refresh or close the browser window.</li>
                </ol>

                <Alert
                  variant={isBeforeStart ? 'secondary' : canStartNewAttempt || isAttemptInProgress ? 'warning' : 'secondary'}
                  className="small"
                >
                  {isAttemptInProgress
                    ? 'You have an exam in progress. Resume it to continue where you left off.'
                    : isBeforeStart
                      ? `This exam will become available on ${new Date(assignment!.startAtUtc).toLocaleString()}. Come back then to start.`
                      : attemptsUsed === 0
                        ? maxAttempts === 1
                          ? 'You can start the exam only once. Make sure you are ready.'
                          : `You can attempt this exam up to ${maxAttempts} times. Make sure you are ready.`
                        : canStartNewAttempt
                          ? `You've used ${attemptsUsed} of ${maxAttempts} attempts. You have ${remainingAttempts} attempt${
                              remainingAttempts === 1 ? '' : 's'
                            } remaining.`
                          : `You have used all ${maxAttempts} of your allowed attempts for this exam.`}
                </Alert>

                {isAttemptInProgress ? (
                  <Link to={`/exams/${id}/take`} className="btn btn-warning w-100">
                    Resume Exam
                  </Link>
                ) : isBeforeStart ? (
                  <Button variant="outline-secondary" className="w-100" disabled>
                    Not Started Yet
                  </Button>
                ) : canStartNewAttempt ? (
                  <Button variant="primary" className="w-100" onClick={beginSystemCheck}>
                    {attemptsUsed === 0 ? 'Start Exam Now' : 'Retake Exam'}
                  </Button>
                ) : canViewResults ? (
                  <Link to={`/results/${id}`} className="btn btn-outline-secondary w-100">
                    View Result
                  </Link>
                ) : (
                  <Button variant="outline-secondary" className="w-100" disabled>
                    Results Unavailable
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {!isLoading && !isError && exam && mode === 'check' && (
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 640 }}>
          <Card.Body className="p-4">
            <h1 className="h5 fw-bold mb-1">System Readiness Check</h1>
            <p className="text-muted small mb-4">Please check your system before starting the exam</p>

            <div className="d-flex flex-column gap-3 mb-4">
              {CHECK_ITEMS.map((item) => {
                const status = checks[item.key];
                return (
                  <div key={item.key} className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <CheckIcon status={status} />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`small fw-medium ${
                        status === 'good' ? 'text-success' : status === 'bad' ? 'text-danger' : 'text-muted'
                      }`}
                    >
                      {status === 'checking' ? 'Checking...' : status === 'good' ? item.goodLabel : item.badLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <Card className="border bg-light mb-4">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">Exam Rules</h2>
                <Form.Check
                  type="checkbox"
                  id="agree-to-rules"
                  label="I have read and agree to the exam rules and guidelines."
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                />
              </Card.Body>
            </Card>

            {startMutation.isError && (
              <Alert variant="danger" className="small mb-3">
                {extractStartError(startMutation.error)}
              </Alert>
            )}

            <div className="d-flex justify-content-between gap-2">
              <Button variant="outline-secondary" disabled={isStillChecking} onClick={runSystemCheck}>
                Start System Check Again
              </Button>
              <Button
                variant="primary"
                disabled={!agreedToRules || startMutation.isPending}
                onClick={() => {
                  requestFullscreenFromGesture();
                  startMutation.mutate();
                }}
              >
                {startMutation.isPending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Starting...
                  </>
                ) : (
                  'I am Ready, Start Exam'
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </StudentLayout>
  );
}
