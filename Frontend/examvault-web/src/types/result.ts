export interface QuestionResultOptionResponse {
  optionId: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionResultResponse {
  questionId: string;
  questionText: string;
  marks: number;
  marksAwarded: number;
  selectedOptionId: string | null;
  isCorrect: boolean;
  options: QuestionResultOptionResponse[];
  questionType: string;
  answerText: string | null;
  isPendingGrading: boolean;
  selectedOptionIds: string[] | null;
}

export interface ResultSummaryResponse {
  attemptId: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  totalMarks: number;
  passingMarks: number;
  passed: boolean;
  submittedAtUtc: string;
  questions: QuestionResultResponse[] | null;
  hasPendingGrading: boolean;
  // Computed server-side from this attempt's own answers, independent of
  // whether `questions` above is null (ShowCorrectAnswers off) - the
  // aggregate counts don't reveal which specific questions were right or
  // wrong, so they're always available.
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracy: number;
  // Computed server-side by comparing this student's own latest submitted
  // attempt against everyone else's on the same exam - fetched internally
  // via a short-lived service-to-service token (ISystemTokenProvider), never
  // exposing any other student's raw data back in this response. Null when
  // this isn't the student's own latest attempt (an old, superseded retake)
  // or when the ranking lookup itself failed - never blocks the student
  // from seeing their own score either way.
  rank: number | null;
  percentile: number | null;
  totalParticipants: number | null;
  averageAccuracy: number | null;
}

// Admin-only: one row per student attempt on an exam, always carries the
// per-question breakdown (no ShowCorrectAnswers gating - that only applies
// to the student-facing "mine" result).
export interface AdminAttemptResultResponse {
  attemptId: string;
  userId: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  totalMarks: number;
  passingMarks: number;
  passed: boolean;
  submittedAtUtc: string;
  questions: QuestionResultResponse[];
  hasPendingGrading: boolean;
  fullscreenExitCount: number;
  noFaceDetectedCount: number;
  multipleFacesDetectedCount: number;
  tabSwitchCount: number;
  multipleTabsCount: number;
  copyPasteCount: number;
  rightClickCount: number;
  multipleMonitorsCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracy: number;
  // Null for every attempt except this user's own LATEST submitted attempt
  // on the exam - an earlier, superseded attempt is still listed but never
  // ranked. Rank/Percentile are Admin-report only for now - computing them
  // for a student's own result would require ResultService to fetch every
  // other student's raw attempt using the student's own (Admin/Instructor-
  // only) bearer token, which real service-to-service auth doesn't exist
  // for yet.
  rank: number | null;
  percentile: number | null;
  totalParticipants: number | null;
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'F';

// A failed attempt is always graded F regardless of percentage, since
// PassingMarks doesn't necessarily line up with the percentage bands below.
export function getGrade(totalScore: number, totalMarks: number, passed: boolean): Grade {
  if (!passed) {
    return 'F';
  }
  const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
  if (percentage >= 90) return 'A+';
  if (percentage >= 75) return 'A';
  if (percentage >= 60) return 'B';
  return 'C';
}
