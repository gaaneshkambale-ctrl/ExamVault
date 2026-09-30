import { EMPTY_SIGNATURE } from '../components/FunctionSignatureEditor';
import type { FunctionSignatureValue } from '../components/FunctionSignatureEditor';
import type { SqlTestCaseRow } from '../components/SqlTestCaseEditor';
import type { ProgrammingLanguage } from '../types/question';
import type { BankQuestion, SaveBankQuestionRequest } from '../types/questionBank';
import { formatTypedValue, parseTypedValue } from './typedValue';

// Form state for a Code/Programming bank question - the same fields and the
// same request/response conversions the exam-question forms use, kept in one
// place so the Question Bank form stays a thin layer over them.
export interface CodeFormState {
  starterCode: string;
  programmingLanguage: ProgrammingLanguage | '';
  allowLanguageChange: boolean;
  sampleAnswer: string;
  sampleInput: string;
  sampleOutput: string;
  constraints: string;
  signature: FunctionSignatureValue;
  sqlTestCases: SqlTestCaseRow[];
}

export const emptyCodeForm = (): CodeFormState => ({
  starterCode: '',
  programmingLanguage: '',
  allowLanguageChange: false,
  sampleAnswer: '',
  sampleInput: '',
  sampleOutput: '',
  constraints: '',
  signature: EMPTY_SIGNATURE,
  sqlTestCases: [],
});

let nextRowKey = 0;

export function codeFormFromQuestion(q: BankQuestion): CodeFormState {
  const parameters = (q.parameters ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((p) => ({ key: nextRowKey++, name: p.name, type: p.type }));

  const testCases = (q.testCases ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tc) => ({
      key: nextRowKey++,
      argumentTexts: tc.arguments.map((arg, i) => formatTypedValue(arg, parameters[i]?.type ?? 'String')),
      expectedOutputText: formatTypedValue(tc.expectedOutput, q.returnType ?? 'String'),
    }));

  return {
    starterCode: q.starterCode ?? '',
    programmingLanguage: q.programmingLanguage ?? '',
    allowLanguageChange: q.allowLanguageChange ?? false,
    sampleAnswer: q.sampleAnswer ?? '',
    sampleInput: q.sampleInput ?? '',
    sampleOutput: q.sampleOutput ?? '',
    constraints: q.constraints ?? '',
    signature: {
      functionName: q.functionName ?? '',
      returnType: q.returnType ?? '',
      parameters,
      testCases,
    },
    sqlTestCases: (q.sqlTestCases ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((tc) => ({ key: nextRowKey++, setupSql: tc.setupSql })),
  };
}

// Sql questions have no function signature; everything else is graded through one.
export function codeFormToRequestFields(code: CodeFormState): Partial<SaveBankQuestionRequest> {
  const isSql = code.programmingLanguage === 'Sql';
  const { signature } = code;
  return {
    starterCode: code.starterCode || null,
    programmingLanguage: code.programmingLanguage || null,
    allowLanguageChange: code.allowLanguageChange,
    sampleAnswer: code.sampleAnswer || null,
    functionName: isSql ? null : signature.functionName.trim() || null,
    returnType: isSql ? null : signature.returnType || null,
    parameters: isSql ? [] : signature.parameters.map(({ name, type }) => ({ name, type })),
    testCases: isSql
      ? []
      : signature.testCases.map((tc) => ({
          arguments: tc.argumentTexts.map((text, i) => parseTypedValue(text, signature.parameters[i].type)),
          expectedOutput: parseTypedValue(tc.expectedOutputText, signature.returnType || 'String'),
        })),
    sqlTestCases: isSql ? code.sqlTestCases.map(({ setupSql }) => ({ setupSql })) : [],
    sampleInput: code.sampleInput || null,
    sampleOutput: code.sampleOutput || null,
    constraints: code.constraints || null,
  };
}

// Mirrors the obvious server rules (the server stays the authority).
export function validateCodeForm(code: CodeFormState): string[] {
  const errors: string[] = [];
  if (!code.programmingLanguage) errors.push('Select a programming language.');
  if (code.programmingLanguage === 'Sql') {
    if (code.sqlTestCases.length > 0 && !code.sampleAnswer.trim()) {
      errors.push('Sql test cases need a Reference Query.');
    }
    if (code.sqlTestCases.some((t) => !t.setupSql.trim())) errors.push('Each Sql test case needs Setup SQL.');
  } else if (code.signature.functionName.trim()) {
    if (!code.signature.returnType) errors.push('Choose a return type for the function.');
    if (code.signature.parameters.length === 0) errors.push('A function signature needs at least one parameter.');
  }
  return errors;
}
