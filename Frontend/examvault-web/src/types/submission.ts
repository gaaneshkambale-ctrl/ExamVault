export type AttemptStatus = 'InProgress' | 'Submitted' | 'AutoSubmitted';

export interface StartAttemptRequest {
  examId: string;
}

export interface SaveAnswerRequest {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  answerText?: string | null;
  selectedOptionIds?: string[] | null;
}

export interface ExamAttemptResponse {
  id: string;
  examId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAtUtc: string;
  submittedAtUtc: string | null;
  fullscreenExitCount: number;
  noFaceDetectedCount: number;
  multipleFacesDetectedCount: number;
  tabSwitchCount: number;
  multipleTabsCount: number;
  copyPasteCount: number;
  rightClickCount: number;
  multipleMonitorsCount: number;
  liveWatchEnabled: boolean;
}

export type ProctoringViolationType =
  | 'NoFaceDetected'
  | 'MultipleFacesDetected'
  | 'TabSwitch'
  | 'MultipleTabs'
  | 'CopyPaste'
  | 'RightClick'
  | 'MultipleMonitors';

export interface AttemptAnswerResponse {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  answeredAtUtc: string;
  answerText?: string | null;
  marksAwarded?: number | null;
  gradedByUserId?: string | null;
  gradedAtUtc?: string | null;
  selectedOptionIds?: string[] | null;
}

export interface SubmitAttemptRequest {
  isAutoSubmitted: boolean;
}

export interface AttemptSectionStateResponse {
  id: string;
  attemptId: string;
  sectionId: string;
  enteredAtUtc: string;
  deadlineUtc: string;
  isCompleted: boolean;
  completedAtUtc: string | null;
}

export interface AttemptWithAnswersResponse {
  attempt: ExamAttemptResponse;
  answers: AttemptAnswerResponse[];
  sectionStates: AttemptSectionStateResponse[];
}

export interface UngradedAnswerResponse {
  attemptId: string;
  questionId: string;
  userId: string;
  answerText: string;
  answeredAtUtc: string;
}

export type ViolationSeverity = 'Low' | 'Medium' | 'Critical';

export type ViolationStatus = 'Open' | 'UnderInvestigation' | 'Resolved';

export interface ViolationEventResponse {
  id: string;
  attemptId: string;
  examId: string;
  userId: string;
  type: ProctoringViolationType;
  severity: ViolationSeverity;
  status: ViolationStatus;
  detectedAtUtc: string;
  resolvedAtUtc: string | null;
}
