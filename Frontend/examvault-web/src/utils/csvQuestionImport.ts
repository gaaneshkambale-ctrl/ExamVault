import type { CreateQuestionOptionRequest, QuestionDifficulty, QuestionType } from '../types/question';

export interface CsvImportRow {
  rowNumber: number;
  questionText: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
  options: CreateQuestionOptionRequest[];
  shuffleOptions: boolean;
  error: string | null;
}

const CSV_TEMPLATE_HEADER =
  'Question Text,Type,Difficulty,Marks,Option A,Option B,Option C,Option D,Correct Answer,Shuffle Options';

const CSV_TEMPLATE_EXAMPLE_ROWS = [
  'What is the capital of France?,Single Choice,Easy,1,Paris,London,Berlin,Madrid,A,No',
  'The sun rises in the east.,True/False,Easy,1,True,False,,,A,No',
];

export function buildCsvTemplate(): string {
  return [CSV_TEMPLATE_HEADER, ...CSV_TEMPLATE_EXAMPLE_ROWS].join('\r\n');
}

/** Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas, and "" escaped quotes. */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function normalizeType(raw: string): QuestionType | null {
  const v = raw.trim().toLowerCase();
  // "Single Choice" is the current label (see QUESTION_TYPE_LABELS) - the
  // older "Multiple Choice"/"MCQ" aliases still parse so existing CSV
  // templates/files out in the wild keep working.
  if (['single choice', 'singlechoice', 'sc', 'multiple choice', 'multiplechoice', 'mcq'].includes(v)) {
    return 'MultipleChoice';
  }
  if (['true/false', 'truefalse', 'true false', 'tf'].includes(v)) return 'TrueFalse';
  return null;
}

function normalizeDifficulty(raw: string): QuestionDifficulty | null {
  const v = raw.trim().toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'medium') return 'Medium';
  if (v === 'hard') return 'Hard';
  return null;
}

function normalizeYesNo(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1';
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/** Parses a question-import CSV (header row required) into per-row results, each either
 * fully valid and ready to create, or carrying an `error` describing what's wrong. */
export function parseQuestionImportCsv(text: string): CsvImportRow[] {
  const table = parseCsvText(text);
  if (table.length === 0) {
    return [];
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const dataRows = table.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''));

  const columnIndex = (name: string) => header.indexOf(name);
  const idx = {
    text: columnIndex('question text'),
    type: columnIndex('type'),
    difficulty: columnIndex('difficulty'),
    marks: columnIndex('marks'),
    options: [
      columnIndex('option a'),
      columnIndex('option b'),
      columnIndex('option c'),
      columnIndex('option d'),
    ],
    correct: columnIndex('correct answer'),
    shuffle: columnIndex('shuffle options'),
  };

  return dataRows.map((cells, dataIndex) => {
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');

    const questionText = get(idx.text);
    const questionType = normalizeType(get(idx.type));
    const difficulty = normalizeDifficulty(get(idx.difficulty));
    const marksRaw = get(idx.marks);
    const marks = Number(marksRaw);
    const optionTexts = idx.options.map((i) => get(i));
    const correctLetter = get(idx.correct).toUpperCase();
    const shuffleOptions = normalizeYesNo(get(idx.shuffle));

    const errors: string[] = [];
    if (!questionText) errors.push('question text is required');
    if (!questionType) errors.push('type must be "Single Choice" or "True/False"');
    if (!difficulty) errors.push('difficulty must be Easy, Medium, or Hard');
    if (!marksRaw || !Number.isFinite(marks) || marks <= 0) {
      errors.push('marks must be a number greater than 0');
    }

    let options: CreateQuestionOptionRequest[] = [];
    if (questionType === 'TrueFalse') {
      const isTrueCorrect = correctLetter === 'A' || correctLetter === 'TRUE';
      const isFalseCorrect = correctLetter === 'B' || correctLetter === 'FALSE';
      options = [
        { optionText: 'True', isCorrect: isTrueCorrect },
        { optionText: 'False', isCorrect: isFalseCorrect },
      ];
      if (isTrueCorrect === isFalseCorrect) {
        errors.push('correct answer must be A (True) or B (False)');
      }
    } else if (questionType === 'MultipleChoice') {
      const filledOptions = optionTexts
        .map((optionText, i) => ({ optionText, letter: OPTION_LETTERS[i] }))
        .filter((o) => o.optionText !== '');
      if (filledOptions.length < 2) {
        errors.push('at least two options (Option A, Option B) are required');
      }
      const correctIndex = OPTION_LETTERS.indexOf(correctLetter);
      if (correctIndex === -1 || !optionTexts[correctIndex]) {
        errors.push('correct answer must match a filled-in option letter (A-D)');
      }
      options = filledOptions.map((o) => ({
        optionText: o.optionText,
        isCorrect: o.letter === correctLetter,
      }));
    } else {
      errors.push('cannot validate options without a recognized type');
    }

    return {
      rowNumber: dataIndex + 1,
      questionText,
      questionType: questionType ?? 'MultipleChoice',
      difficulty: difficulty ?? 'Easy',
      marks: Number.isFinite(marks) ? marks : 0,
      options,
      shuffleOptions,
      error: errors.length > 0 ? errors.join('; ') : null,
    };
  });
}
