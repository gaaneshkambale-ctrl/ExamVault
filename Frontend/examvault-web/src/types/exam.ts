export type ExamType = 'Manual' | 'AiGenerated';
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
  description: string;
  category: string;
  containsSections: boolean;
  examType: ExamType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  instructions: string;
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
}

export interface ReminderSettingsResponse {
  enable24HourReminder: boolean;
  enable1HourReminder: boolean;
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
}
