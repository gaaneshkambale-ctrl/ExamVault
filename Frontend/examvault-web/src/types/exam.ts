export type ExamType = 'Manual' | 'AiGenerated';
export type ExamStatus = 'Draft' | 'Published' | 'Archived';

export interface CreateExamRequest {
  title: string;
  description: string;
  examType: ExamType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  instructions: string;
}

export interface ExamResponse {
  id: string;
  title: string;
  description: string;
  examType: ExamType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  instructions: string;
  status: ExamStatus;
  totalQuestions: number;
  createdOn: string;
}
