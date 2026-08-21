export type AttemptStatus = 'InProgress' | 'Submitted' | 'AutoSubmitted';

export interface StartAttemptRequest {
  examId: string;
}

export interface SaveAnswerRequest {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
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
