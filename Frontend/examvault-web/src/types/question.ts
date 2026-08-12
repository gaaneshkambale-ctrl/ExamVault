export type QuestionType = 'MultipleChoice' | 'TrueFalse';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CreateQuestionOptionRequest {
  optionText: string;
  isCorrect: boolean;
}

export interface CreateQuestionRequest {
  examId: string;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: QuestionDifficulty;
  options: CreateQuestionOptionRequest[];
}

export interface QuestionOptionResponse {
  id: string;
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface QuestionResponse {
  id: string;
  examId: string;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: QuestionDifficulty;
  options: QuestionOptionResponse[];
  createdOn: string;
}
