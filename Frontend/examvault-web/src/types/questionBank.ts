// Question Bank (organization-owned, reusable across exams). Deliberately
// separate from types/question.ts: bank questions carry Subject/Topic/Tags
// and status instead of ExamId/SectionId, and only the option-based types
// are bankable for now (Code/Programming is not).
import type {
  ParameterType,
  ProgrammingLanguage,
  QuestionParameterRequest,
  QuestionParameterResponse,
  QuestionSqlTestCaseRequest,
  QuestionSqlTestCaseResponse,
  QuestionTestCaseRequest,
  QuestionTestCaseResponse,
} from './question';

export type BankQuestionType = 'MultipleChoice' | 'MultiSelect' | 'TrueFalse' | 'CodeProgram';
export type BankQuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type BankQuestionStatus = 'Draft' | 'Active' | 'Archived';

export const BANK_QUESTION_TYPES: { value: BankQuestionType; label: string }[] = [
  { value: 'MultipleChoice', label: 'Single Choice' },
  { value: 'MultiSelect', label: 'Multiple Choice' },
  { value: 'TrueFalse', label: 'True/False' },
  { value: 'CodeProgram', label: 'Code / Programming' },
];

export const BANK_DIFFICULTIES: BankQuestionDifficulty[] = ['Easy', 'Medium', 'Hard'];
export const BANK_STATUSES: BankQuestionStatus[] = ['Draft', 'Active', 'Archived'];

export interface BankSubject {
  id: string;
  name: string;
  description: string | null;
  topicCount: number;
  questionCount: number;
  createdAtUtc: string;
}

export interface BankTopic {
  id: string;
  subjectId: string;
  name: string;
  questionCount: number;
  createdAtUtc: string;
}

export interface BankTag {
  id: string;
  name: string;
  questionCount: number;
  createdAtUtc: string;
}

export interface BankQuestionOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface BankQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  questionType: BankQuestionType;
  questionText: string;
  explanation: string | null;
  difficulty: BankQuestionDifficulty;
  defaultMarks: number;
  negativeMarks: number;
  shuffleOptions: boolean;
  status: BankQuestionStatus;
  options: BankQuestionOption[];
  tags: BankTag[];
  createdByUserId: string;
  createdByName: string | null;
  createdAtUtc: string;
  updatedByUserId: string | null;
  updatedAtUtc: string | null;
  // Exam questions copied from this bank question, across the organization.
  usageCount: number;
  // Only meaningful when listed with an examId: already copied into that exam.
  inExam: boolean;
  // Code/Programming only - same shapes as QuestionResponse.
  starterCode?: string | null;
  programmingLanguage?: ProgrammingLanguage | null;
  allowLanguageChange?: boolean;
  sampleAnswer?: string | null;
  functionName?: string | null;
  returnType?: ParameterType | null;
  parameters?: QuestionParameterResponse[] | null;
  testCases?: QuestionTestCaseResponse[] | null;
  sqlTestCases?: QuestionSqlTestCaseResponse[] | null;
  sampleInput?: string | null;
  sampleOutput?: string | null;
  constraints?: string | null;
}

export interface BankQuestionPage {
  items: BankQuestion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SaveBankQuestionRequest {
  subjectId: string;
  topicId: string | null;
  questionType: BankQuestionType;
  questionText: string;
  difficulty: BankQuestionDifficulty;
  defaultMarks: number;
  options: { optionText: string; isCorrect: boolean }[];
  explanation?: string | null;
  negativeMarks: number;
  shuffleOptions: boolean;
  status: BankQuestionStatus;
  tagIds: string[];
  // Code/Programming only - same flat shape as CreateQuestionRequest.
  starterCode?: string | null;
  programmingLanguage?: ProgrammingLanguage | null;
  allowLanguageChange?: boolean;
  sampleAnswer?: string | null;
  functionName?: string | null;
  returnType?: ParameterType | null;
  parameters?: QuestionParameterRequest[];
  testCases?: QuestionTestCaseRequest[];
  sqlTestCases?: QuestionSqlTestCaseRequest[];
  sampleInput?: string | null;
  sampleOutput?: string | null;
  constraints?: string | null;
}

export interface BankQuestionFilters {
  search?: string;
  subjectId?: string;
  topicId?: string;
  questionType?: BankQuestionType;
  difficulty?: BankQuestionDifficulty;
  status?: BankQuestionStatus;
  tagId?: string;
  mine?: boolean;
  examId?: string;
  page: number;
  pageSize: number;
}

export interface AddBankQuestionsToExamResult {
  added: number;
  skipped: { bankQuestionId: string; reason: string }[];
  createdQuestionIds: string[];
}

// "Draw `count` random Active questions from this subject (optionally narrowed)".
export interface RandomDrawRule {
  subjectId: string;
  topicId: string | null;
  questionType: BankQuestionType | null;
  difficulty: BankQuestionDifficulty | null;
  count: number;
}

export interface RandomRuleAvailability {
  requested: number;
  available: number;
}
