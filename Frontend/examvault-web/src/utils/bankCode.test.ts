import { describe, expect, it } from 'vitest';
import { codeFormFromQuestion, codeFormToRequestFields, emptyCodeForm, validateCodeForm } from './bankCode';
import type { BankQuestion } from '../types/questionBank';

const functionQuestion: BankQuestion = {
  id: 'q1',
  subjectId: 's1',
  subjectName: 'DSA',
  topicId: null,
  topicName: null,
  questionType: 'CodeProgram',
  questionText: 'Second largest',
  explanation: null,
  difficulty: 'Medium',
  defaultMarks: 5,
  negativeMarks: 0,
  shuffleOptions: false,
  status: 'Active',
  options: [],
  tags: [],
  createdByUserId: 'u1',
  createdByName: null,
  createdAtUtc: '2026-09-30T00:00:00Z',
  updatedByUserId: null,
  updatedAtUtc: null,
  usageCount: 0,
  inExam: false,
  starterCode: 'def f(arr):\n    pass',
  programmingLanguage: 'Python',
  allowLanguageChange: true,
  sampleAnswer: 'sorted(set(arr))[-2]',
  functionName: 'second_largest',
  returnType: 'Int',
  parameters: [{ name: 'arr', type: 'IntArray', displayOrder: 0 }],
  testCases: [
    { arguments: [[1, 2]], expectedOutput: 1, displayOrder: 1 },
    { arguments: [[12, 35, 1, 10, 34, 1]], expectedOutput: 34, displayOrder: 0 },
  ],
  sqlTestCases: [],
  sampleInput: '[1,2,3]',
  sampleOutput: '2',
  constraints: 'No builtins',
};

describe('bank code question conversions', () => {
  it('turns a saved function question into form state, ordered by displayOrder', () => {
    const form = codeFormFromQuestion(functionQuestion);

    expect(form.programmingLanguage).toBe('Python');
    expect(form.allowLanguageChange).toBe(true);
    expect(form.signature.functionName).toBe('second_largest');
    expect(form.signature.parameters.map((p) => p.type)).toEqual(['IntArray']);
    expect(form.signature.testCases[0].argumentTexts).toEqual(['12, 35, 1, 10, 34, 1']);
    expect(form.signature.testCases[0].expectedOutputText).toBe('34');
  });

  it('round-trips form state back into the request without losing typed values', () => {
    const fields = codeFormToRequestFields(codeFormFromQuestion(functionQuestion));

    expect(fields.functionName).toBe('second_largest');
    expect(fields.returnType).toBe('Int');
    expect(fields.parameters).toEqual([{ name: 'arr', type: 'IntArray' }]);
    expect(fields.testCases).toEqual([
      { arguments: [[12, 35, 1, 10, 34, 1]], expectedOutput: 34 },
      { arguments: [[1, 2]], expectedOutput: 1 },
    ]);
    expect(fields.sqlTestCases).toEqual([]);
    expect(fields.sampleAnswer).toBe('sorted(set(arr))[-2]');
  });

  it('sends only Sql fields for a Sql question, never a function signature', () => {
    const form = {
      ...emptyCodeForm(),
      programmingLanguage: 'Sql' as const,
      sampleAnswer: 'SELECT 1;',
      sqlTestCases: [{ key: 1, setupSql: 'CREATE TABLE t(a INT);' }],
    };

    const fields = codeFormToRequestFields(form);

    expect(fields.functionName).toBeNull();
    expect(fields.parameters).toEqual([]);
    expect(fields.testCases).toEqual([]);
    expect(fields.sqlTestCases).toEqual([{ setupSql: 'CREATE TABLE t(a INT);' }]);
  });

  it('requires a language, a reference query for Sql cases, and a complete signature', () => {
    expect(validateCodeForm(emptyCodeForm())).toContain('Select a programming language.');

    const sqlNoReference = {
      ...emptyCodeForm(),
      programmingLanguage: 'Sql' as const,
      sqlTestCases: [{ key: 1, setupSql: 'CREATE TABLE t(a INT);' }],
    };
    expect(validateCodeForm(sqlNoReference)).toContain('Sql test cases need a Reference Query.');

    const halfSignature = {
      ...emptyCodeForm(),
      programmingLanguage: 'Python' as const,
      signature: { ...emptyCodeForm().signature, functionName: 'f' },
    };
    expect(validateCodeForm(halfSignature)).toEqual([
      'Choose a return type for the function.',
      'A function signature needs at least one parameter.',
    ]);

    expect(validateCodeForm({ ...emptyCodeForm(), programmingLanguage: 'Python' })).toEqual([]);
  });
});
