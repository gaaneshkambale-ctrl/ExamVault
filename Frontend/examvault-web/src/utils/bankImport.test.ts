import { describe, expect, it } from 'vitest';
import { rowsToCsv } from './csvFromRows';
import { bankRequestFromAiDraft, bankRequestFromCodeRow, bankRequestFromStandardRow } from './bankImportMapping';
import { parseQuestionImportCsv } from './csvQuestionImport';
import type { CsvCodeImportRow, CsvImportRow } from './csvQuestionImport';

const dest = { subjectId: 's1', topicId: 't1', status: 'Draft' as const };

describe('rowsToCsv', () => {
  it('quotes commas, quotes and newlines and leaves plain cells alone', () => {
    const csv = rowsToCsv([['a', 'b,c', 'say "hi"', 'line1\nline2']]);
    expect(csv).toBe('a,"b,c","say ""hi""","line1\nline2"');
  });

  it('maps empty cells, numbers, booleans and dates to what the importers expect', () => {
    const csv = rowsToCsv([[null, undefined, 3, 2.5, true, false, new Date('2026-09-30T10:00:00Z')]]);
    expect(csv).toBe(',,3,2.5,True,False,2026-09-30');
  });

  it('produces text the existing CSV question parser accepts, incl. a boolean True/False option cell', () => {
    const csv = rowsToCsv([
      ['Question Text', 'Type', 'Difficulty', 'Marks', 'Option A', 'Option B', 'Correct Answer', 'Shuffle Options'],
      ['The sun rises in the east.', 'True/False', 'Easy', 1, true, false, 'A', 'No'],
      ['Capital of France, the city?', 'Single Choice', 'Easy', 2, 'Paris', 'Rome', 'A', 'No'],
    ]);

    const rows = parseQuestionImportCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.error)).toEqual([null, null]);
    expect(rows[0].questionType).toBe('TrueFalse');
    expect(rows[0].options.map((o) => o.optionText)).toEqual(['True', 'False']);
    expect(rows[1].questionText).toBe('Capital of France, the city?');
    expect(rows[1].marks).toBe(2);
  });
});

describe('bank import mapping', () => {
  const standard: CsvImportRow = {
    rowNumber: 2,
    questionText: 'What is 1NF?',
    questionType: 'MultiSelect',
    difficulty: 'Hard',
    marks: 3,
    options: [
      { optionText: 'A', isCorrect: true },
      { optionText: 'B', isCorrect: true },
    ],
    shuffleOptions: true,
    error: null,
  };

  it('applies the chosen subject/topic/status to a standard row and keeps its content', () => {
    const req = bankRequestFromStandardRow(standard, dest);

    expect(req).toMatchObject({
      subjectId: 's1',
      topicId: 't1',
      status: 'Draft',
      questionType: 'MultiSelect',
      questionText: 'What is 1NF?',
      difficulty: 'Hard',
      defaultMarks: 3,
      shuffleOptions: true,
      negativeMarks: 0,
      tagIds: [],
    });
    expect(req.options).toHaveLength(2);
  });

  it('maps a code row to a CodeProgram request with no options', () => {
    const code: CsvCodeImportRow = {
      rowNumber: 2,
      questionText: 'Sum',
      difficulty: 'Easy',
      marks: 5,
      programmingLanguage: 'Python',
      starterCode: 'def f(a,b):',
      sampleAnswer: '',
      allowLanguageChange: true,
      functionName: 'f',
      returnType: 'Int',
      parameters: [{ name: 'a', type: 'Int' }],
      testCases: [{ arguments: [1], expectedOutput: 1 }],
      sqlTestCases: [],
      sampleInput: '',
      sampleOutput: '',
      constraints: '',
      error: null,
    };

    const req = bankRequestFromCodeRow(code, { ...dest, topicId: null, status: 'Active' });

    expect(req.questionType).toBe('CodeProgram');
    expect(req.options).toEqual([]);
    expect(req.topicId).toBeNull();
    expect(req.status).toBe('Active');
    expect(req.defaultMarks).toBe(5);
    expect(req.functionName).toBe('f');
    expect(req.sampleAnswer).toBeNull();
    expect(req.testCases).toEqual([{ arguments: [1], expectedOutput: 1 }]);
  });

  it('turns an AI draft into a bank request carrying the destination status', () => {
    const req = bankRequestFromAiDraft(
      {
        id: 'd1',
        questionType: 'TrueFalse',
        questionText: 'SQL is a language.',
        marks: 1,
        difficulty: 'Easy',
        options: [
          { optionText: 'True', isCorrect: true },
          { optionText: 'False', isCorrect: false },
        ],
      },
      dest,
    );

    expect(req).toMatchObject({ questionType: 'TrueFalse', status: 'Draft', defaultMarks: 1, subjectId: 's1' });
    expect(req.options).toHaveLength(2);
  });
});
