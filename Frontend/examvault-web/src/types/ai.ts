export type GenerateSource = 'ExistingExam' | 'TopicText';
export type GenerateQuestionType = 'MultipleChoice' | 'MultiSelect' | 'TrueFalse';
export type GenerateDifficulty = 'Easy' | 'Medium' | 'Hard';

// The three free-text types need an answer-submission path and a grading UI
// for AI-generated drafts specifically, neither of which exist yet (manual
// Code/Programming questions do have both, but the AI generator has no
// test-case-authoring step). Shown disabled rather than hidden on both
// AI-generate entry points, matching this app's "From Document" precedent.
export const DISABLED_QUESTION_TYPES = [
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
