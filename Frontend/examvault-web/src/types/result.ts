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
