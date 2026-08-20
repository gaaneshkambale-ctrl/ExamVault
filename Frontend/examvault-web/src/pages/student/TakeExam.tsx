import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useSections } from '../../hooks/useSections';
import { useMyAssignmentForExam } from '../../hooks/useAssignments';
import { useProctoringSettings } from '../../hooks/useProctoringSettings';
import { useProctoring } from '../../hooks/useProctoring';
import {
  completeSection,
  enterSection,
  getMyAttempt,
  recordFullscreenExit,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from '../../api/submissionApi';
import type { QuestionResponse } from '../../types/question';
import type { SectionResponse } from '../../types/section';
import type { AttemptSectionStateResponse, ExamAttemptResponse } from '../../types/submission';

type NavState = 'answered' | 'not-answered' | 'marked' | 'not-visited';
type Mode = 'loading' | 'take' | 'review' | 'submitted';
type NavFilter = 'all' | 'answered' | 'unanswered' | 'marked';

interface SectionGroup {
  section: SectionResponse | null;
  questions: QuestionResponse[];
}

interface SectionTimerState {
  deadlineUtc: string;
  isCompleted: boolean;
}

// Generic tech-flavored line icons for the section slider cards - there's no
// per-section icon/subject config to key off of, so these just cycle by
// index. Same stroke style as the icon set used for the admin exam stat
// cards, and a single brand-tinted circle rather than per-card rainbow
// colors, so the slider actually matches the rest of the app's palette.
function SectionCodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function SectionBookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function SectionLayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function SectionChecklistIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SectionTargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SectionBulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  );
}

const SECTION_ICONS = [
  SectionCodeIcon,
  SectionBookIcon,
  SectionLayersIcon,
  SectionChecklistIcon,
  SectionTargetIcon,
  SectionBulbIcon,
];

const NAV_LEGEND: Array<{ state: NavState; label: string; color: string }> = [
  { state: 'answered', label: 'Answered', color: '#16a34a' },
  { state: 'not-answered', label: 'Not Answered', color: '#dc3545' },
  { state: 'marked', label: 'Marked for Review', color: '#f59e0b' },
  { state: 'not-visited', label: 'Not Visited', color: '#e5e7eb' },
];

// Fill colors match each state's legend swatch exactly - they previously
// didn't (not-answered rendered as plain white, indistinguishable from
// not-visited), which silently hid the "visited but left blank" state.
const navStateStyle: Record<NavState, { background: string; color: string }> = {
  answered: { background: '#16a34a', color: 'white' },
  'not-answered': { background: '#dc3545', color: 'white' },
  marked: { background: '#f59e0b', color: 'white' },
  'not-visited': { background: '#e5e7eb', color: '#6c757d' },
};

const NAV_FILTERS: Array<{ value: NavFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'answered', label: 'Answered' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'marked', label: 'Marked' },
];

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

// Small always-visible preview of the proctoring camera feed, so the student
// can see exactly what's being watched instead of a camera silently running
// in the background. Same MediaStream the detection hook reads from - a
// stream can back more than one <video> element at once.
function CameraPreview({ stream }: { stream: MediaStream }) {
  return (
    <div
      className="position-fixed rounded-3 overflow-hidden shadow-lg border border-light"
      style={{ bottom: 20, right: 20, width: 160, height: 120, zIndex: 1500, background: '#000' }}
    >
      <video
        ref={(el) => {
          if (el && el.srcObject !== stream) {
            el.srcObject = stream;
          }
        }}
        autoPlay
        muted
        playsInline
        className="w-100 h-100"
        style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
      <span
        className="position-absolute bottom-0 start-0 end-0 text-white text-center small py-1"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        Camera monitoring active
      </span>
    </div>
  );
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
  const { data: sections } = useSections(id, Boolean(exam?.containsSections));
  const { data: assignment } = useMyAssignmentForExam(id);
  const { data: proctoringSettings } = useProctoringSettings();

  const [mode, setMode] = useState<Mode>('loading');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAtUtc, setAttemptStartedAtUtc] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<ExamAttemptResponse | null>(null);
  const [attemptError, setAttemptError] = useState('');
  const [sectionIndex, setSectionIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sectionRemainingSeconds, setSectionRemainingSeconds] = useState<number | null>(null);
  const [navFilter, setNavFilter] = useState<NavFilter>('all');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [initialSectionStates, setInitialSectionStates] = useState<AttemptSectionStateResponse[]>([]);
  const [sectionStates, setSectionStates] = useState<Record<string, SectionTimerState>>({});
  const [sectionInitialized, setSectionInitialized] = useState(false);
  const [sectionEntering, setSectionEntering] = useState(false);

  // Defaults to enabled while the global setting is still loading, so
  // behavior doesn't regress during that window - matches the fail-open
  // default every ProctoringSettings field is created with server-side.
  const fullscreenExitEnabled = proctoringSettings?.fullscreenExitEnabled ?? true;

  // Browsers won't let a site block Esc from exiting fullscreen (by design,
  // it's a user-safety escape hatch) - so instead of trying to prevent it,
  // detect the exit and block the exam behind a warning until they return.
  // Also best-effort logs it server-side so an admin can review it later -
  // never lets that call block or fail the warning UI itself.
  useEffect(() => {
    if (!fullscreenExitEnabled) {
      return;
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && (mode === 'take' || mode === 'review')) {
        setFullscreenExitCount((count) => count + 1);
        setShowFullscreenWarning(true);
        if (attemptId) {
          void recordFullscreenExit(attemptId).catch(() => {});
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [mode, attemptId, fullscreenExitEnabled]);

  // AI proctoring suite (face detection, tab/window monitoring, duplicate-tab
  // detection, copy/paste + right-click blocking) - gated on both the
  // per-assignment EnableProctoring flag and the global admin master switch.
  const proctoringActive =
    Boolean(assignment?.enableProctoring) &&
    Boolean(proctoringSettings?.proctoringEnabled) &&
    (mode === 'take' || mode === 'review');
  const proctoring = useProctoring(proctoringActive, attemptId, {
    faceDetectionEnabled: proctoringSettings?.faceDetectionEnabled ?? true,
    multiPersonDetectionEnabled: proctoringSettings?.multiPersonDetectionEnabled ?? true,
    screenMonitoringEnabled: proctoringSettings?.screenMonitoringEnabled ?? true,
    multipleTabsEnabled: proctoringSettings?.multipleTabsEnabled ?? true,
    copyPasteBlockingEnabled: proctoringSettings?.copyPasteBlockingEnabled ?? true,
    rightClickBlockingEnabled: proctoringSettings?.rightClickBlockingEnabled ?? true,
    multipleMonitorsEnabled: proctoringSettings?.multipleMonitorsEnabled ?? true,
  });

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

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
          setInitialSectionStates(result.sectionStates);
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

  const isSectioned = Boolean(exam?.containsSections) && !!sections && sections.length > 0;

  const orderedSections = useMemo(
    () => (sections ? [...sections].sort((a, b) => a.displayOrder - b.displayOrder) : []),
    [sections],
  );

  // Every question, across every section - used for exam-wide totals (Review
  // screen, Submitted screen), as opposed to `displayQuestions` below which
  // is scoped to whichever section is currently open.
  const allQuestions = questions ?? [];

  const sectionGroups = useMemo<SectionGroup[]>(() => {
    if (!questions) {
      return [];
    }
    if (!isSectioned) {
      const ordered = exam?.shuffleQuestions ? shuffle(questions) : questions;
      const withOptions = exam?.shuffleOptions
        ? ordered.map((q) => ({ ...q, options: shuffle(q.options) }))
        : ordered;
      return [{ section: null, questions: withOptions }];
    }
    return orderedSections.map((section) => {
      const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
      const ordered = section.shuffleQuestions ? shuffle(sectionQuestions) : sectionQuestions;
      const withOptions = section.shuffleOptions
        ? ordered.map((q) => ({ ...q, options: shuffle(q.options) }))
        : ordered;
      return { section, questions: withOptions };
    });
    // Deliberately keyed on the shuffle flags rather than the whole `exam`
    // object, so the layout doesn't reshuffle on unrelated exam refetches.
  }, [questions, isSectioned, orderedSections, exam?.shuffleQuestions, exam?.shuffleOptions]);

  const currentGroup = sectionIndex >= 0 ? sectionGroups[sectionIndex] : undefined;
  const displayQuestions = useMemo(() => currentGroup?.questions ?? [], [currentGroup]);
  const navigationType = currentGroup?.section?.navigationType ?? 'Free';
  const isForwardOnly = navigationType !== 'Free';

  const persistAnswer = (questionId: string, answer: AnswerState) => {
    if (!attemptId) {
      return;
    }
    saveAnswerMutation.mutate({ questionId, answer });
  };

  // Enters a section (records/refreshes its per-section deadline server-side
  // and enforces Sequential/Locked gating) and switches the view to it.
  // No-op for the "virtual" null-section group non-sectioned exams use.
  const switchToSection = async (targetIndex: number) => {
    const targetGroup = sectionGroups[targetIndex];
    if (!targetGroup) {
      return;
    }

    const current = displayQuestions[currentIndex];
    if (current) {
      persistAnswer(current.id, answers[current.id] ?? { selectedOptionId: null, isMarkedForReview: false });
    }

    if (!targetGroup.section || !attemptId) {
      setSectionIndex(targetIndex);
      setCurrentIndex(0);
      setMode('take');
      return;
    }

    setSectionEntering(true);
    setAttemptError('');
    try {
      const state = await enterSection(attemptId, targetGroup.section.id);
      setSectionStates((prev) => ({
        ...prev,
        [targetGroup.section!.id]: { deadlineUtc: state.deadlineUtc, isCompleted: state.isCompleted },
      }));
      setSectionIndex(targetIndex);
      setCurrentIndex(0);
      setMode('take');
    } catch (error) {
      setAttemptError(extractError(error));
    } finally {
      setSectionEntering(false);
    }
  };

  // Marks the current section done and moves on - to the next section if
  // there is one, otherwise to Review (or straight to auto-submit when
  // called because the section's own timer ran out on the last section).
  const finishCurrentSectionAndAdvance = async (auto: boolean) => {
    const group = sectionGroups[sectionIndex];
    if (group?.section && attemptId) {
      try {
        const state = await completeSection(attemptId, group.section.id);
        setSectionStates((prev) => ({
          ...prev,
          [group.section!.id]: { deadlineUtc: state.deadlineUtc, isCompleted: true },
        }));
      } catch {
        // Best-effort - a network hiccup here shouldn't trap the student in
        // a finished section; the server will still catch stale re-entry.
      }
    }

    const nextIndex = sectionIndex + 1;
    if (nextIndex < sectionGroups.length) {
      await switchToSection(nextIndex);
    } else if (auto) {
      runSubmit(true);
    } else {
      const current = displayQuestions[currentIndex];
      if (current) {
        persistAnswer(current.id, answers[current.id] ?? { selectedOptionId: null, isMarkedForReview: false });
      }
      setMode('review');
    }
  };

  // Resolve which section to land on once the attempt + section data are
  // both ready: the first not-yet-completed section in order, so a resumed
  // attempt skips sections already finished instead of restarting at 1.
  useEffect(() => {
    if (sectionInitialized || mode !== 'take' || !attemptId || sectionGroups.length === 0) {
      return;
    }
    if (!isSectioned) {
      setSectionInitialized(true);
      setSectionIndex(0);
      return;
    }

    const stateMap: Record<string, SectionTimerState> = {};
    for (const s of initialSectionStates) {
      stateMap[s.sectionId] = { deadlineUtc: s.deadlineUtc, isCompleted: s.isCompleted };
    }
    setSectionStates(stateMap);
    const startIndex = orderedSections.findIndex((s) => !stateMap[s.id]?.isCompleted);
    setSectionInitialized(true);
    void switchToSection(startIndex === -1 ? 0 : startIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionInitialized, mode, attemptId, isSectioned, sectionGroups.length, initialSectionStates, orderedSections]);

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
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    },
    onError: (error) => setAttemptError(extractError(error)),
  });

  const { mutate: runSubmit } = submitMutation;

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const requestSubmit = () => {
    if (exam?.confirmBeforeSubmit) {
      setShowSubmitConfirm(true);
    } else {
      submitMutation.mutate(false);
    }
  };

  // Overall exam countdown: exam.durationMinutes + the attempt's real
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

  // Per-section countdown - only runs while a real (non-null) section is
  // open. Auto-advances to the next section (or submits, if this was the
  // last one) once the section's own deadline passes.
  useEffect(() => {
    const section = currentGroup?.section;
    if (mode !== 'take' || !section) {
      setSectionRemainingSeconds(null);
      return;
    }
    const state = sectionStates[section.id];
    // Completing the current section (completeSection) updates its state
    // - including while sectionIndex hasn't advanced yet during the
    // switchToSection transition - which re-runs this effect since
    // `sectionStates` changed. Without this check it would re-subscribe to
    // the same already-finished section's stale deadline and keep ticking
    // it down (and could re-trigger auto-advance) instead of going blank
    // until the next section's own timer takes over.
    if (!state?.deadlineUtc || state.isCompleted) {
      setSectionRemainingSeconds(null);
      return;
    }
    const endTime = new Date(state.deadlineUtc).getTime();
    let intervalId: ReturnType<typeof setInterval>;
    let hasAdvanced = false;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSectionRemainingSeconds(remaining);
      if (remaining <= 0 && !hasAdvanced) {
        hasAdvanced = true;
        clearInterval(intervalId);
        void finishCurrentSectionAndAdvance(true);
      }
    };

    tick();
    intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentGroup?.section?.id, sectionStates]);

  const saveAnswerMutation = useMutation({
    mutationFn: (payload: { questionId: string; answer: AnswerState }) =>
      saveAnswer(attemptId!, {
        questionId: payload.questionId,
        selectedOptionId: payload.answer.selectedOptionId,
        isMarkedForReview: payload.answer.isMarkedForReview,
      }),
    onSuccess: () => setLastSavedAt(new Date()),
  });

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
    // Forward-only sections still need to allow the one-step advance that
    // "Save & Next" drives - only block backward jumps and skips ahead.
    if (isForwardOnly && index !== currentIndex && index !== currentIndex + 1) {
      return;
    }
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

  const isLoading = mode === 'loading' || isLoadingExam || isLoadingQuestions || (mode === 'take' && !sectionInitialized);
  const currentQuestion = displayQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? { selectedOptionId: null, isMarkedForReview: false })
    : null;

  // Bucketed off navState (not raw answer flags) so the grid colors, the
  // filter tabs, and the stats row can never disagree with each other - a
  // marked-and-answered question shows as "marked" everywhere consistently.
  // Scoped to the current section (matches the Question Navigator sidebar);
  // `totalAnsweredCount` etc. below cover the whole exam for Review/Submit.
  const answeredCount = displayQuestions.filter((q) => navState(q) === 'answered').length;
  const markedCount = displayQuestions.filter((q) => navState(q) === 'marked').length;
  const unansweredCount = displayQuestions.filter(
    (q) => navState(q) === 'not-answered' || navState(q) === 'not-visited',
  ).length;

  const totalAnsweredCount = allQuestions.filter((q) => navState(q) === 'answered').length;
  const totalMarkedCount = allQuestions.filter((q) => navState(q) === 'marked').length;
  const totalUnansweredCount = allQuestions.filter(
    (q) => navState(q) === 'not-answered' || navState(q) === 'not-visited',
  ).length;

  const matchesFilter = (question: QuestionResponse): boolean => {
    const state = navState(question);
    if (navFilter === 'all') return true;
    if (navFilter === 'answered') return state === 'answered';
    if (navFilter === 'marked') return state === 'marked';
    return state === 'not-answered' || state === 'not-visited';
  };

  const isLastQuestionInSection = currentIndex === displayQuestions.length - 1;

  const canOpenSection = (targetIndex: number): boolean => {
    if (!isSectioned) {
      return true;
    }
    for (let i = 0; i < targetIndex; i++) {
      const earlier = orderedSections[i];
      if (earlier.navigationType !== 'Free' && !sectionStates[earlier.id]?.isCompleted) {
        return false;
      }
    }
    return true;
  };

  const sectionNavigator = isSectioned && (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body className="p-3">
        <h2 className="h6 fw-bold mb-3">Sections</h2>
        <div className="d-flex gap-3 pb-1" style={{ overflowX: 'auto' }}>
          {orderedSections.map((section, index) => {
            const isCurrent = index === sectionIndex;
            const isCompleted = Boolean(sectionStates[section.id]?.isCompleted);
            const isOpenable = canOpenSection(index);
            const isLocked = !isOpenable && !isCurrent && !isCompleted;
            const sectionQuestions = sectionGroups[index]?.questions ?? [];
            const total = sectionQuestions.length;
            const answered = sectionQuestions.filter((q) => navState(q) === 'answered').length;
            const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;
            const progressColor =
              total > 0 && answered === total ? '#16a34a' : answered > 0 ? '#d97706' : '#94a3b8';
            const SectionIcon = SECTION_ICONS[index % SECTION_ICONS.length];

            return (
              <button
                key={section.id}
                type="button"
                disabled={sectionEntering || (!isOpenable && !isCurrent)}
                onClick={() => void switchToSection(index)}
                className="text-start border-0 bg-transparent p-0 flex-shrink-0"
                style={{ width: 216, opacity: isLocked ? 0.55 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
              >
                <div
                  className="d-flex align-items-center gap-2 px-3 py-3 rounded-4"
                  style={{
                    border: isCurrent ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                    background: isCurrent ? '#eef2ff' : 'white',
                    boxShadow: isCurrent ? '0 4px 10px rgba(79, 70, 229, 0.14)' : 'none',
                  }}
                >
                  <div className="position-relative flex-shrink-0">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36, background: '#e0e7ff', color: '#4338ca' }}
                    >
                      {isLocked ? '\u{1F512}' : <SectionIcon />}
                    </div>
                    {isCompleted && (
                      <span
                        className="position-absolute rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                        style={{ width: 14, height: 14, fontSize: 9, bottom: -2, right: -2, border: '1.5px solid white' }}
                      >
                        &#10003;
                      </span>
                    )}
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div
                      className="fw-semibold text-truncate"
                      style={{ fontSize: 13.5, color: '#0f172a' }}
                      title={section.name}
                    >
                      {section.name}
                    </div>
                    <div className="d-flex justify-content-between align-items-center" style={{ fontSize: 11.5 }}>
                      <span className="text-muted">
                        {total} Question{total === 1 ? '' : 's'}
                      </span>
                      <span className="fw-bold" style={{ color: progressColor }}>
                        {answered}/{total}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-1 rounded-pill" style={{ height: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div
                    className="h-100 rounded-pill"
                    style={{ width: `${progressPct}%`, background: isCurrent ? '#4f46e5' : progressColor }}
                  />
                </div>
                {isCurrent && sectionRemainingSeconds !== null && (
                  <div className="text-center mt-1 fw-medium" style={{ fontSize: 11, color: '#4f46e5' }}>
                    &#9201; {formatDuration(sectionRemainingSeconds)} left
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );

  const questionNavigator = (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <h2 className="h6 fw-bold mb-3">Question Navigator</h2>

        <div className="d-flex gap-1 mb-3 p-1 rounded-2 bg-light">
          {NAV_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setNavFilter(f.value)}
              className="btn btn-sm flex-fill border-0 fw-medium"
              style={
                navFilter === f.value
                  ? { background: '#0f172a', color: 'white' }
                  : { background: 'transparent', color: '#495057' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <Row className="g-2 text-center mb-3">
          <Col xs={3}>
            <div className="fw-bold">{displayQuestions.length}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              All
            </div>
          </Col>
          <Col xs={3}>
            <div className="fw-bold text-success">{answeredCount}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              Answered
            </div>
          </Col>
          <Col xs={3}>
            <div className="fw-bold text-danger">{unansweredCount}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              Unanswered
            </div>
          </Col>
          <Col xs={3}>
            <div className="fw-bold text-warning">{markedCount}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              Marked
            </div>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2 mb-4">
          {displayQuestions.map((question, index) => {
            if (!matchesFilter(question)) {
              return null;
            }
            const isCurrent = mode === 'take' && index === currentIndex;
            const isDisabled = isForwardOnly && index !== currentIndex;
            return (
              <button
                key={question.id}
                type="button"
                disabled={isDisabled}
                onClick={() => goToIndex(index)}
                className="rounded-2 fw-medium"
                style={{
                  width: 34,
                  height: 34,
                  border: isCurrent ? '2px solid #2563eb' : '1px solid #dee2e6',
                  opacity: isDisabled ? 0.5 : 1,
                  ...navStateStyle[navState(question)],
                }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="d-flex flex-column gap-2">
          {NAV_LEGEND.map((item) => (
            <div key={item.state} className="d-flex align-items-center gap-2 small">
              <span className="rounded-1 border flex-shrink-0" style={{ width: 14, height: 14, background: item.color }} />
              {item.label}
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 small">
            <span
              className="rounded-1 flex-shrink-0"
              style={{ width: 14, height: 14, border: '2px solid #2563eb' }}
            />
            Current
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <StudentLayout active="My Exams" hideSidebar={mode === 'take' || mode === 'review'}>
      {proctoringActive && proctoring.stream && <CameraPreview stream={proctoring.stream} />}

      {showFullscreenWarning && (mode === 'take' || mode === 'review') && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3"
          style={{ background: 'rgba(15, 23, 42, 0.85)', zIndex: 2000 }}
        >
          <Card className="border-0 shadow-lg text-center" style={{ maxWidth: 420 }}>
            <Card.Body className="p-4">
              <div
                className="rounded-circle bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 56, height: 56 }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="h5 fw-bold mb-2">You exited fullscreen</h2>
              <p className="text-muted mb-1">Fullscreen mode is required while the exam is in progress.</p>
              <p className="text-danger fw-medium mb-4">
                Warning {fullscreenExitCount}: exiting fullscreen may be flagged for review.
              </p>
              <Button
                variant="primary"
                className="w-100"
                onClick={() => {
                  void document.documentElement
                    .requestFullscreen?.()
                    .then(() => setShowFullscreenWarning(false))
                    .catch(() => {});
                }}
              >
                Return to Fullscreen
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      {mode !== 'submitted' && (
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h1 className="h5 fw-bold mb-0">
              {isLoadingExam ? <Spinner animation="border" size="sm" /> : (exam?.title ?? 'Take Exam')}
            </h1>
            <div className="d-flex align-items-center gap-3">
              <div className="text-center">
                <div className="text-muted small mb-1">Time Left</div>
                <div className="border rounded-2 px-3 py-1 fw-bold" style={{ minWidth: 110 }}>
                  {remainingSeconds !== null ? formatDuration(remainingSeconds) : '--:--:--'}
                </div>
              </div>
              <Badge bg={isOnline ? 'success' : 'danger'} className="fw-normal py-2 px-3">
                {isOnline ? 'Connected' : 'Offline'}
              </Badge>
              {proctoringActive && (
                <Badge
                  bg={proctoring.faceStatus === 'no-face' || proctoring.faceStatus === 'multiple-faces' ? 'warning' : 'secondary'}
                  className="fw-normal py-2 px-3"
                >
                  {proctoring.faceStatus === 'no-face'
                    ? 'No Face Detected'
                    : proctoring.faceStatus === 'multiple-faces'
                      ? 'Multiple Faces Detected'
                      : 'Proctoring Active'}
                </Badge>
              )}
              <Button
                variant="primary"
                disabled={mode === 'loading' || submitMutation.isPending}
                onClick={() => (mode === 'review' ? requestSubmit() : setMode('review'))}
              >
                Submit Exam
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {attemptError && <Alert variant="danger">{attemptError}</Alert>}

      {isLoading && !attemptError && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && !attemptError && mode !== 'submitted' && allQuestions.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            This exam doesn't have any questions yet.
          </Card.Body>
        </Card>
      )}

      {!isLoading && !attemptError && mode === 'take' && currentQuestion && currentAnswer && (
        <>
          {sectionNavigator}
          <Row className="g-3">
            <Col xs={12} lg={3}>
              {questionNavigator}
            </Col>

            <Col xs={12} lg={9}>
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">
                      {currentGroup?.section && (
                        <span className="fw-medium text-dark">{currentGroup.section.name}</span>
                      )}
                      {currentGroup?.section && ' · '}
                      Question {currentIndex + 1} of {displayQuestions.length}
                    </span>
                    <Form.Check
                      type="checkbox"
                      label="Mark for Review"
                      checked={currentAnswer.isMarkedForReview}
                      onChange={(e) => updateAnswer(currentQuestion.id, { isMarkedForReview: e.target.checked })}
                    />
                  </div>

                  {currentGroup?.section?.instructions && (
                    <Alert variant="light" className="border small">
                      {currentGroup.section.instructions}
                    </Alert>
                  )}

                  <p className="fw-medium mb-4">{currentQuestion.questionText}</p>

                  <Form>
                    {currentQuestion.options.map((option, index) => {
                      const selected = currentAnswer.selectedOptionId === option.id;
                      return (
                        <label
                          key={option.id}
                          htmlFor={`option-${option.id}`}
                          className="d-flex align-items-center gap-2 border rounded-3 px-3 py-2 mb-2"
                          style={{
                            cursor: 'pointer',
                            borderColor: selected ? '#16a34a' : undefined,
                            background: selected ? '#f0fdf4' : undefined,
                          }}
                        >
                          <Form.Check
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            id={`option-${option.id}`}
                            checked={selected}
                            onChange={() => updateAnswer(currentQuestion.id, { selectedOptionId: option.id })}
                            className="mb-0"
                          />
                          <span>
                            {OPTION_LETTERS[index] ?? index + 1}. {option.optionText}
                          </span>
                        </label>
                      );
                    })}
                  </Form>

                  <div className="small mt-2" style={{ minHeight: 20 }}>
                    {saveAnswerMutation.isPending && <span className="text-muted">Saving...</span>}
                    {!saveAnswerMutation.isPending && lastSavedAt && (
                      <span className="text-success">
                        &#10003; Answer saved &nbsp;|&nbsp; Last saved: {lastSavedAt.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="d-flex justify-content-between mt-3">
                    <Button
                      variant="outline-secondary"
                      disabled={isForwardOnly || currentIndex === 0}
                      onClick={() => goToIndex(Math.max(0, currentIndex - 1))}
                    >
                      &larr; Save &amp; Previous
                    </Button>
                    <Button
                      variant="primary"
                      disabled={sectionEntering}
                      onClick={() => {
                        if (isLastQuestionInSection) {
                          void finishCurrentSectionAndAdvance(false);
                        } else {
                          goToIndex(currentIndex + 1);
                        }
                      }}
                    >
                      {isLastQuestionInSection
                        ? sectionIndex < sectionGroups.length - 1
                          ? 'Next Section →'
                          : 'Review & Submit'
                        : 'Save & Next →'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
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
                    <div className="h4 fw-bold mb-0">{allQuestions.length}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Answered</div>
                    <div className="h4 fw-bold mb-0 text-success">{totalAnsweredCount}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Not Answered</div>
                    <div className="h4 fw-bold mb-0 text-danger">{totalUnansweredCount}</div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="text-muted small">Marked for Review</div>
                    <div className="h4 fw-bold mb-0 text-warning">{totalMarkedCount}</div>
                  </Col>
                </Row>

                {isSectioned && (
                  <div className="mb-4">
                    <h3 className="h6 fw-bold mb-2">Sections</h3>
                    <div className="d-flex flex-column gap-2">
                      {orderedSections.map((section, index) => {
                        const sectionQuestions = sectionGroups[index]?.questions ?? [];
                        const sectionAnswered = sectionQuestions.filter((q) => navState(q) === 'answered').length;
                        const isCompleted = Boolean(sectionStates[section.id]?.isCompleted);
                        const canReturn = section.navigationType === 'Free' || index === sectionIndex;
                        return (
                          <div
                            key={section.id}
                            className="d-flex justify-content-between align-items-center border rounded-2 px-3 py-2"
                          >
                            <div>
                              <div className="fw-medium">{section.name}</div>
                              <div className="text-muted small">
                                {sectionAnswered} / {sectionQuestions.length} answered
                                {isCompleted && ' · Completed'}
                              </div>
                            </div>
                            {canReturn && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => void switchToSection(index)}
                              >
                                Go to Section
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    onClick={requestSubmit}
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
                  <Col xs={6} className="fw-medium">{allQuestions.length || exam?.totalQuestions || 0}</Col>
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

      <Modal show={showSubmitConfirm} onHide={() => setShowSubmitConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Submit Exam?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Once submitted, you won't be able to change your answers. Are you sure you want to submit
          this exam?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowSubmitConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={submitMutation.isPending}
            onClick={() => {
              setShowSubmitConfirm(false);
              submitMutation.mutate(false);
            }}
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </Modal.Footer>
      </Modal>
    </StudentLayout>
  );
}
