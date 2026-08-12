export type QuestionType = 'MultipleChoice' | 'TrueFalse';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CreateQuestionOptionRequest {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionFormFields {
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: QuestionDifficulty;
  shuffleOptions: boolean;
  options: CreateQuestionOptionRequest[];
}

export interface CreateQuestionRequest extends QuestionFormFields {
  examId: string;
}

export type UpdateQuestionRequest = QuestionFormFields;

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
  shuffleOptions: boolean;
  options: QuestionOptionResponse[];
  createdOn: string;
}
