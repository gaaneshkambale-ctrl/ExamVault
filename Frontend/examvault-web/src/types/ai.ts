export type GenerateSource = 'ExistingExam' | 'TopicText';
export type GenerateQuestionType = 'MultipleChoice' | 'TrueFalse';
export type GenerateDifficulty = 'Easy' | 'Medium' | 'Hard';

// Reserved in the backend's QuestionType enum but not wired end-to-end yet:
// true multi-select Multiple Choice needs AttemptAnswer to support more than
// one selected option per question (it's singular today); the three
// free-text types need an answer-submission path and a grading UI, neither
// of which exist. Shown disabled rather than hidden on both AI-generate
// entry points, matching this app's "From Document" precedent.
export const DISABLED_QUESTION_TYPES = [
  'Multiple Choice',
  'Short Answer',
  'Long Answer / Descriptive',
  'Code / Programming',
] as const;

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
