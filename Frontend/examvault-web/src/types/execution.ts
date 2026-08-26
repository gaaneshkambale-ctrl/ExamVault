import type { ParameterType, ProgrammingLanguage } from './question';

export interface RunCodeParameterRequest {
  name: string;
  type: ParameterType;
}

export interface RunCodeTestCaseRequest {
  arguments: unknown[];
  expectedOutput: unknown;
}

export interface RunCodeRequest {
  language: ProgrammingLanguage;
  studentCode: string;
  functionName: string;
  parameters: RunCodeParameterRequest[];
  returnType: ParameterType;
  testCases: RunCodeTestCaseRequest[];
}

// Sql questions only - no function signature/arguments concept applies.
// The Reference Query and each test case's Setup SQL are fetched
// server-side by Execution Service itself, never sent by the browser.
export interface RunSqlRequest {
  questionId: string;
  studentQuery: string;
}

export interface TestCaseOutcomeResponse {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error: string | null;
}

export interface RunCodeResponse {
  outcomes: TestCaseOutcomeResponse[];
}
