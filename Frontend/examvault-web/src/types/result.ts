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
