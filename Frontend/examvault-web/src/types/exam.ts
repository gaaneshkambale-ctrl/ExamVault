export type CreationMethod = 'Manual' | 'AiGenerated';
export type ExamStatus = 'Draft' | 'Published' | 'Archived';

export const EXAM_CATEGORIES = [
  'Technical',
  'Database',
  'Aptitude',
  'Programming',
  'Soft Skills',
  'General',
] as const;

export interface CreateExamRequest {
  title: string;
  examCode?: string | null;
  description: string;
  category: string;
  containsSections: boolean;
  creationMethod: CreationMethod;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  instructions: string;
  examTypeId?: string | null;
  tags?: string;
}

export interface ExamSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  startAtUtc: string | null;
  endAtUtc: string | null;
  maxAttempts: number;
  negativeMarkingEnabled: boolean;
  negativeMarks: number;
  showSectionSummaryToStudents: boolean;
  allowCalculator: boolean;
  allowNotes: boolean;
  autoSubmitOnTimeEnd: boolean;
  confirmBeforeSubmit: boolean;
}

export interface UpdateExamRequest extends CreateExamRequest, ExamSettings {}

export interface ExamResponse extends CreateExamRequest, ExamSettings {
  id: string;
  status: ExamStatus;
  totalQuestions: number;
  createdOn: string;
  examTypeName?: string | null;
  tenantId: string;
  tags: string;
  createdByUserId: string;
  createdByName: string | null;
}

// Dynamic, admin-manageable exam-purpose classification (Practice/Mock/
// Certification/etc.) - distinct from CreationMethod (Manual/AiGenerated) and
// from Category (free-text subject tag).
export interface ExamTypeOption {
  id: string;
  name: string;
  purpose: string | null;
  createdAtUtc: string;
}

export interface CreateExamTypeRequest {
  name: string;
  purpose?: string | null;
}

export interface UpdateExamTypeRequest {
  name: string;
  purpose?: string | null;
}

export interface ReminderSettingsResponse {
  enable24HourReminder: boolean;
  enable1HourReminder: boolean;
  updatedAtUtc?: string;
}

export interface ProctoringSettingsResponse {
  proctoringEnabled: boolean;
  faceDetectionEnabled: boolean;
  multiPersonDetectionEnabled: boolean;
  screenMonitoringEnabled: boolean;
  fullscreenExitEnabled: boolean;
  multipleTabsEnabled: boolean;
  copyPasteBlockingEnabled: boolean;
  rightClickBlockingEnabled: boolean;
  multipleMonitorsEnabled: boolean;
  sessionTimeoutMinutes: number;
  updatedAtUtc?: string;
}

export type QuestionNavigationMode = 'Free' | 'Sequential';
export type ResultPublishingMode = 'Automatic' | 'Manual';

export interface ExamDefaultsResponse {
  defaultDurationMinutes: number;
  passingScorePercent: number;
  defaultMaxAttempts: number;
  negativeMarkingEnabled: boolean;
  negativeMarkingValue: number;
  autoSaveEnabled: boolean;
  autoSubmitEnabled: boolean;
  questionNavigationMode: QuestionNavigationMode;
  resultPublishingMode: ResultPublishingMode;
  updatedAtUtc: string;
}
