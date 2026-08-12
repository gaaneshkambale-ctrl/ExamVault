export type GenerateSource = 'ExistingExam' | 'TopicText';
export type GenerateQuestionType = 'MultipleChoice' | 'TrueFalse';
export type GenerateDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface GenerateQuestionsRequest {
  source: GenerateSource;
  examId: string | null;
  topic: string | null;
  questionCount: number;
  questionTypes: GenerateQuestionType[];
  difficultyLevels: GenerateDifficulty[];
  additionalInstructions: string | null;
}

export interface DraftQuestionOption {
  optionText: string;
  isCorrect: boolean;
}

export interface DraftQuestion {
  id: string;
  questionType: GenerateQuestionType;
  questionText: string;
  marks: number;
  difficulty: GenerateDifficulty;
  options: DraftQuestionOption[];
}
