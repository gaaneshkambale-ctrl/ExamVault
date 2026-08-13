export interface ResultSummaryResponse {
  attemptId: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  totalMarks: number;
  passingMarks: number;
  passed: boolean;
  submittedAtUtc: string;
}
