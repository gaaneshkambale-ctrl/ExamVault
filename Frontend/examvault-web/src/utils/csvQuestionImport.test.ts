import { describe, expect, it } from 'vitest';
import {
  buildCodeCsvTemplate,
  buildCsvTemplate,
  parseCodeQuestionImportCsv,
  parseQuestionImportCsv,
} from './csvQuestionImport';

describe('parseQuestionImportCsv', () => {
  it('parses a valid Multiple Choice row', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'What is 2+2?,Multiple Choice,Easy,1,4,3,5,6,A,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    expect(rows[0].questionText).toBe('What is 2+2?');
    expect(rows[0].questionType).toBe('MultipleChoice');
    expect(rows[0].difficulty).toBe('Easy');
    expect(rows[0].marks).toBe(1);
    expect(rows[0].options).toEqual([
      { optionText: '4', isCorrect: true },
      { optionText: '3', isCorrect: false },
      { optionText: '5', isCorrect: false },
      { optionText: '6', isCorrect: false },
    ]);
  });

  it('parses a valid True/False row', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'The sky is blue.,True/False,Medium,2,True,False,,,A,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    expect(rows[0].questionType).toBe('TrueFalse');
    expect(rows[0].options).toEqual([
      { optionText: 'True', isCorrect: true },
      { optionText: 'False', isCorrect: false },
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      '"Which of these, if any, are primes?",Multiple Choice,Hard,2,2,4,6,8,A,Yes';

    const rows = parseQuestionImportCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    expect(rows[0].questionText).toBe('Which of these, if any, are primes?');
    expect(rows[0].shuffleOptions).toBe(true);
  });

  it('flags a row with a missing question text', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      ',Multiple Choice,Easy,1,4,3,,,A,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows[0].error).toContain('question text is required');
  });

  it('flags a row with an unrecognized type', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'What is 2+2?,Essay,Easy,1,4,3,,,A,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows[0].error).toContain('type must be');
  });

  it('flags a Multiple Choice row whose correct answer has no matching option', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'What is 2+2?,Multiple Choice,Easy,1,4,3,,,C,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows[0].error).toContain('correct answer must match');
  });

  it('flags a row with non-positive marks', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'What is 2+2?,Multiple Choice,Easy,0,4,3,,,A,No';

    const rows = parseQuestionImportCsv(csv);

    expect(rows[0].error).toContain('marks must be a number greater than 0');
  });

  it('returns an empty array for an empty file', () => {
    expect(parseQuestionImportCsv('')).toEqual([]);
  });

  it('skips blank trailing lines', () => {
    const csv =
      'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options\n' +
      'What is 2+2?,Multiple Choice,Easy,1,4,3,,,A,No\n\n';

    expect(parseQuestionImportCsv(csv)).toHaveLength(1);
  });
});

describe('buildCsvTemplate', () => {
  it('produces a header row that parseQuestionImportCsv understands', () => {
    const template = buildCsvTemplate();
    const rows = parseQuestionImportCsv(template);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.error === null)).toBe(true);
  });
});

const CODE_HEADER =
  'Question Text,Difficulty,Marks,Programming Language,Starter Code,Sample Answer / Reference Query,Allow Language Change,Function Name,Return Type,Parameters,Test Cases';

describe('parseCodeQuestionImportCsv', () => {
  it('parses a valid Python row', () => {
    const csv =
      `${CODE_HEADER}\n` +
      '"Write a function that adds two numbers.",Easy,2,Python,"def add(a, b):\n    pass","def add(a, b):\n    return a + b",No,,,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBeNull();
    expect(rows[0].questionText).toBe('Write a function that adds two numbers.');
    expect(rows[0].difficulty).toBe('Easy');
    expect(rows[0].marks).toBe(2);
    expect(rows[0].programmingLanguage).toBe('Python');
    expect(rows[0].starterCode).toContain('def add');
    expect(rows[0].allowLanguageChange).toBe(false);
    expect(rows[0].functionName).toBe('');
    expect(rows[0].parameters).toEqual([]);
    expect(rows[0].testCases).toEqual([]);
  });

  it('accepts SQL with a blank starter code', () => {
    const csv =
      `${CODE_HEADER}\n` +
      'Return every student with a score above 85.,Medium,3,SQL,,"SELECT name FROM students WHERE score > 85;",No,,,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toBeNull();
    expect(rows[0].programmingLanguage).toBe('Sql');
    expect(rows[0].starterCode).toBe('');
  });

  it('flags a row with an unrecognized programming language', () => {
    const csv = `${CODE_HEADER}\n` + 'Write something.,Easy,1,COBOL,,,No,,,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toContain('programming language must be one of');
  });

  it('flags a row with a missing question text', () => {
    const csv = `${CODE_HEADER}\n` + ',Easy,1,Python,,,No,,,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toContain('question text is required');
  });

  it('parses a function signature with parameters and test cases', () => {
    const csv =
      `${CODE_HEADER}\n` +
      'Sum an array.,Easy,2,Python,,,No,sumArray,Integer,arr:IntArray,"1,2,3=>6;10,20=>30"';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toBeNull();
    expect(rows[0].functionName).toBe('sumArray');
    expect(rows[0].returnType).toBe('Int');
    expect(rows[0].parameters).toEqual([{ name: 'arr', type: 'IntArray' }]);
    expect(rows[0].testCases).toEqual([
      { arguments: [[1, 2, 3]], expectedOutput: 6 },
      { arguments: [[10, 20]], expectedOutput: 30 },
    ]);
  });

  it('accepts a friendly parameter type label as well as the raw enum name', () => {
    const csv = `${CODE_HEADER}\n` + 'Add two.,Easy,2,Python,,,No,add,Integer,a:Integer;b:Int,2|3=>5';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toBeNull();
    expect(rows[0].parameters).toEqual([
      { name: 'a', type: 'Int' },
      { name: 'b', type: 'Int' },
    ]);
  });

  it('leaves parameters/test cases empty when function name is blank', () => {
    const csv = `${CODE_HEADER}\n` + 'Reference only.,Easy,1,Python,,def f(): pass,No,,,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toBeNull();
    expect(rows[0].parameters).toEqual([]);
    expect(rows[0].testCases).toEqual([]);
  });

  it('flags return type/parameters/test cases used without a function name', () => {
    const csv = `${CODE_HEADER}\n` + 'Bad row.,Easy,1,Python,,,No,,Integer,,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toContain('function name is required');
  });

  it('flags a malformed parameters cell', () => {
    const csv = `${CODE_HEADER}\n` + 'Bad row.,Easy,1,Python,,,No,add,Integer,justaname,';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toContain('invalid parameter');
  });

  it('flags a test case whose argument count does not match the parameter count', () => {
    const csv = `${CODE_HEADER}\n` + 'Bad row.,Easy,1,Python,,,No,add,Integer,a:Integer;b:Integer,5=>5';

    const rows = parseCodeQuestionImportCsv(csv);

    expect(rows[0].error).toContain('has 1 argument(s), expected 2');
  });
});

describe('buildCodeCsvTemplate', () => {
  it('produces a header row that parseCodeQuestionImportCsv understands', () => {
    const template = buildCodeCsvTemplate();
    const rows = parseCodeQuestionImportCsv(template);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.error === null)).toBe(true);
  });
});
