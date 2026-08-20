import { describe, expect, it } from 'vitest';
import { buildCsvTemplate, parseQuestionImportCsv } from './csvQuestionImport';

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
