export type QuestionType = 'MultipleChoice' | 'MultiSelect' | 'TrueFalse' | 'CodeProgram';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ProgrammingLanguage = 'CSharp' | 'Java' | 'Python' | 'Cpp' | 'JavaScript' | 'Sql';

export const PROGRAMMING_LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'CSharp', label: 'C#' },
  { value: 'Java', label: 'Java' },
  { value: 'Python', label: 'Python' },
  { value: 'Cpp', label: 'C++' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'Sql', label: 'SQL' },
];

// Auto-grading (Run Code + test cases) - deliberately bounded, not "any
// type": each value needs a driver-code template in every one of the 5
// supported programming languages.
export type ParameterType =
  | 'Int'
  | 'Long'
  | 'Double'
  | 'Boolean'
  | 'String'
  | 'IntArray'
  | 'DoubleArray'
  | 'StringArray';

export const PARAMETER_TYPES: { value: ParameterType; label: string }[] = [
  { value: 'Int', label: 'Integer' },
  { value: 'Long', label: 'Long' },
  { value: 'Double', label: 'Double' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'String', label: 'String' },
  { value: 'IntArray', label: 'Integer Array' },
  { value: 'DoubleArray', label: 'Double Array' },
  { value: 'StringArray', label: 'String Array' },
];

export interface QuestionParameterRequest {
  name: string;
  type: ParameterType;
}

// JSON values - a number/string/boolean/array matching the declared
// parameter/return type. Never a raw string the server has to guess at.
export interface QuestionTestCaseRequest {
  arguments: unknown[];
  expectedOutput: unknown;
}

export interface QuestionParameterResponse {
  name: string;
  type: ParameterType;
  displayOrder: number;
}

export interface QuestionTestCaseResponse {
  arguments: unknown[];
  expectedOutput: unknown;
  displayOrder: number;
}

// Sql questions only - schema + seed data for one test case's fresh
// database. Always visible to students (not the secret - the Reference
// Query held in sampleAnswer is).
export interface QuestionSqlTestCaseRequest {
  setupSql: string;
}

export interface QuestionSqlTestCaseResponse {
  setupSql: string;
  displayOrder: number;
}

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
  starterCode?: string | null;
  programmingLanguage?: ProgrammingLanguage | null;
  allowLanguageChange?: boolean;
  sampleAnswer?: string | null;
  functionName?: string | null;
  returnType?: ParameterType | null;
  parameters?: QuestionParameterRequest[];
  testCases?: QuestionTestCaseRequest[];
  sqlTestCases?: QuestionSqlTestCaseRequest[];
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
  sectionId: string | null;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: QuestionDifficulty;
  shuffleOptions: boolean;
  options: QuestionOptionResponse[];
  createdOn: string;
  starterCode?: string | null;
  programmingLanguage?: ProgrammingLanguage | null;
  allowLanguageChange?: boolean;
  sampleAnswer?: string | null;
  functionName?: string | null;
  returnType?: ParameterType | null;
  parameters?: QuestionParameterResponse[] | null;
  testCases?: QuestionTestCaseResponse[] | null;
  sqlTestCases?: QuestionSqlTestCaseResponse[] | null;
}

// Super Admin platform-wide Question Bank browse only - separate shape
// from QuestionResponse (no options/test-cases/answer-masking concerns,
// adds tenantId). No examTitle - QuestionService has no Exams table of
// its own; join examId against the platform's own cross-tenant exam list.
export interface PlatformQuestionResponse {
  id: string;
  examId: string;
  sectionId: string | null;
  tenantId: string;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: QuestionDifficulty;
  createdAtUtc: string;
  createdByUserId: string;
  createdByName: string | null;
}
