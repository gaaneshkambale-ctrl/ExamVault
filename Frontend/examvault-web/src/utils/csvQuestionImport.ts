import { PARAMETER_TYPES } from '../types/question';
import type {
  CreateQuestionOptionRequest,
  ParameterType,
  ProgrammingLanguage,
  QuestionDifficulty,
  QuestionParameterRequest,
  QuestionTestCaseRequest,
  QuestionType,
} from '../types/question';
import { parseTypedValue } from './typedValue';

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

// Code/Programming questions don't have Options/Correct Answer at all - they
// have a programming language, optional starter code, an optional reference
// solution, and an optional function signature (Function Name/Return Type/
// Parameters/Test Cases) for Run Code + auto-grading - fields the standard
// template above has no columns for. The signature fields mirror
// FunctionSignatureEditor's own manual-entry shape exactly: Function Name
// gates everything else (blank means "manually graded", same as the manual
// form), Parameters is "name:type" pairs separated by ";", and Test Cases is
// one argument per parameter separated by "|" then "=>" then the expected
// output, multiple cases separated by ";" (array arguments are themselves
// comma-separated, e.g. "1,2,3=>6"). Sql questions don't use these four
// columns at all - the setup-script test cases (QuestionSqlTestCase) stay a
// manual Edit Question step, since a multi-statement SQL script doesn't fit
// this encoding without its own escaping problems.
export interface CsvCodeImportRow {
  rowNumber: number;
  questionText: string;
  difficulty: QuestionDifficulty;
  marks: number;
  programmingLanguage: ProgrammingLanguage | null;
  starterCode: string;
  sampleAnswer: string;
  allowLanguageChange: boolean;
  functionName: string;
  returnType: ParameterType | null;
  parameters: QuestionParameterRequest[];
  testCases: QuestionTestCaseRequest[];
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

const CODE_CSV_TEMPLATE_HEADER =
  'Question Text,Difficulty,Marks,Programming Language,Starter Code,Sample Answer / Reference Query,Allow Language Change,Function Name,Return Type,Parameters,Test Cases';

// One example per supported language, each showing the full function-
// signature encoding except the SQL row (which never uses those four
// columns - see CsvCodeImportRow's own comment).
const CODE_CSV_TEMPLATE_EXAMPLE_ROWS = [
  'Write a function that returns the sum of two integers.,Easy,2,Python,"def add(a, b):\n    pass","def add(a, b):\n    return a + b",No,add,Integer,a:Integer;b:Integer,2|3=>5;10|20=>30',
  'Write a function that returns the larger of two integers.,Easy,2,Java,"public int max(int a, int b) {\n    return 0;\n}","public int max(int a, int b) {\n    return Math.max(a, b);\n}",No,max,Integer,a:Integer;b:Integer,3|7=>7;10|2=>10',
  'Write a function that reverses a string.,Medium,3,C#,"public string Reverse(string s) {\n    return s;\n}","public string Reverse(string s) {\n    return new string(s.Reverse().ToArray());\n}",No,Reverse,String,s:String,hello=>olleh;abc=>cba',
  'Write a function that returns the sum of an integer array.,Medium,3,C++,"int sumArray(vector<int> arr) {\n    return 0;\n}","int sumArray(vector<int> arr) {\n    int total = 0;\n    for (int x : arr) total += x;\n    return total;\n}",No,sumArray,Integer,arr:IntArray,"1,2,3=>6;10,20=>30"',
  'Write a function that checks if a number is even.,Easy,1,JavaScript,"function isEven(n) {\n  return false;\n}","function isEven(n) {\n  return n % 2 === 0;\n}",No,isEven,Boolean,n:Integer,4=>true;7=>false',
  'Write a query returning every student with a score above 85.,Medium,3,SQL,,"SELECT name, score FROM students WHERE score > 85;",No,,,,',
];

export function buildCodeCsvTemplate(): string {
  return [CODE_CSV_TEMPLATE_HEADER, ...CODE_CSV_TEMPLATE_EXAMPLE_ROWS].join('\r\n');
}

const PROGRAMMING_LANGUAGE_ALIASES: Record<string, ProgrammingLanguage> = {
  'c#': 'CSharp',
  csharp: 'CSharp',
  java: 'Java',
  python: 'Python',
  'c++': 'Cpp',
  cpp: 'Cpp',
  javascript: 'JavaScript',
  js: 'JavaScript',
  sql: 'Sql',
};

function normalizeProgrammingLanguage(raw: string): ProgrammingLanguage | null {
  return PROGRAMMING_LANGUAGE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

// Accepts both the raw enum name ("IntArray") and PARAMETER_TYPES' own
// friendly label ("Integer Array") case-insensitively, same "be liberal in
// what a CSV cell can say" approach normalizeProgrammingLanguage already
// takes - derived from PARAMETER_TYPES itself so the two can't drift apart.
const PARAMETER_TYPE_ALIASES: Record<string, ParameterType> = Object.fromEntries(
  PARAMETER_TYPES.flatMap((t) => [
    [t.value.toLowerCase(), t.value],
    [t.label.toLowerCase(), t.value],
  ]),
);

function normalizeParameterType(raw: string): ParameterType | null {
  return PARAMETER_TYPE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/** Parses "name:type;name2:type2" into QuestionParameterRequest[], in order (order is
 * also the argument order Test Cases values are matched against). Blank input means
 * "no parameters", not an error - a zero-argument function is still valid. */
function parseParametersCell(raw: string): { parameters: QuestionParameterRequest[]; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { parameters: [], error: null };
  }

  const parameters: QuestionParameterRequest[] = [];
  for (const part of trimmed.split(';').map((p) => p.trim()).filter((p) => p !== '')) {
    const colonIndex = part.indexOf(':');
    const name = colonIndex === -1 ? '' : part.slice(0, colonIndex).trim();
    const typeRaw = colonIndex === -1 ? '' : part.slice(colonIndex + 1).trim();
    const type = typeRaw ? normalizeParameterType(typeRaw) : null;
    if (!name || !type) {
      return { parameters: [], error: `invalid parameter "${part}" (expected name:type, e.g. arr:IntArray)` };
    }
    parameters.push({ name, type });
  }
  return { parameters, error: null };
}

/** Parses "arg1|arg2=>output;arg1|arg2=>output2" into QuestionTestCaseRequest[] - one
 * argument per parameter (in the same order as `parameters`) separated by "|", then
 * "=>" then the expected output, multiple test cases separated by ";". Array arguments
 * are themselves comma-separated (e.g. "1,2,3"), same as the manual Create Question
 * form's own typed-value inputs - reuses that same parseTypedValue so an imported
 * question's JSON payload is byte-for-byte what typing it in by hand would produce. */
function parseTestCasesCell(
  raw: string,
  parameters: QuestionParameterRequest[],
  returnType: ParameterType,
): { testCases: QuestionTestCaseRequest[]; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { testCases: [], error: null };
  }

  const testCases: QuestionTestCaseRequest[] = [];
  for (const group of trimmed.split(';').map((g) => g.trim()).filter((g) => g !== '')) {
    const arrowIndex = group.indexOf('=>');
    if (arrowIndex === -1) {
      return { testCases: [], error: `invalid test case "${group}" (expected args=>expectedOutput)` };
    }
    const argsPart = group.slice(0, arrowIndex).trim();
    const outputPart = group.slice(arrowIndex + 2).trim();
    const argTexts = parameters.length === 0 ? [] : argsPart.split('|').map((a) => a.trim());
    if (argTexts.length !== parameters.length) {
      return {
        testCases: [],
        error: `test case "${group}" has ${argTexts.length} argument(s), expected ${parameters.length}`,
      };
    }
    testCases.push({
      arguments: argTexts.map((text, i) => parseTypedValue(text, parameters[i].type)),
      expectedOutput: parseTypedValue(outputPart, returnType),
    });
  }
  return { testCases, error: null };
}

/** Parses a Code/Programming question-import CSV (header row required), including the
 * optional Function Name/Return Type/Parameters/Test Cases columns for Run Code +
 * auto-grading (see CsvCodeImportRow's own comment for the encoding). Sql's own
 * setup-script test cases still aren't covered - those stay a manual Edit Question step. */
export function parseCodeQuestionImportCsv(text: string): CsvCodeImportRow[] {
  const table = parseCsvText(text);
  if (table.length === 0) {
    return [];
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const dataRows = table.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''));

  const columnIndex = (name: string) => header.indexOf(name);
  const idx = {
    text: columnIndex('question text'),
    difficulty: columnIndex('difficulty'),
    marks: columnIndex('marks'),
    language: columnIndex('programming language'),
    starterCode: columnIndex('starter code'),
    sampleAnswer: columnIndex('sample answer / reference query'),
    allowLanguageChange: columnIndex('allow language change'),
    functionName: columnIndex('function name'),
    returnType: columnIndex('return type'),
    parameters: columnIndex('parameters'),
    testCases: columnIndex('test cases'),
  };

  return dataRows.map((cells, dataIndex) => {
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');

    const questionText = get(idx.text);
    const difficulty = normalizeDifficulty(get(idx.difficulty));
    const marksRaw = get(idx.marks);
    const marks = Number(marksRaw);
    const programmingLanguage = normalizeProgrammingLanguage(get(idx.language));
    const starterCode = get(idx.starterCode);
    const sampleAnswer = get(idx.sampleAnswer);
    const allowLanguageChange = normalizeYesNo(get(idx.allowLanguageChange));
    const functionName = get(idx.functionName);
    const returnTypeRaw = get(idx.returnType);
    const returnType = returnTypeRaw ? normalizeParameterType(returnTypeRaw) : null;
    const parametersRaw = get(idx.parameters);
    const testCasesRaw = get(idx.testCases);

    const errors: string[] = [];
    if (!questionText) errors.push('question text is required');
    if (!difficulty) errors.push('difficulty must be Easy, Medium, or Hard');
    if (!marksRaw || !Number.isFinite(marks) || marks <= 0) {
      errors.push('marks must be a number greater than 0');
    }
    if (!programmingLanguage) {
      errors.push('programming language must be one of C#, Java, Python, C++, JavaScript, or SQL');
    }

    // Function Name gates the rest, same as FunctionSignatureEditor's manual
    // form: blank means "manually graded", so Return Type/Parameters/Test
    // Cases are only meaningful (and only parsed) once it's filled in.
    let parameters: QuestionParameterRequest[] = [];
    let testCases: QuestionTestCaseRequest[] = [];
    if (functionName) {
      if (returnTypeRaw && !returnType) {
        errors.push(`return type "${returnTypeRaw}" is not recognized`);
      }
      const parsedParameters = parseParametersCell(parametersRaw);
      if (parsedParameters.error) {
        errors.push(parsedParameters.error);
      } else {
        parameters = parsedParameters.parameters;
      }
      if (testCasesRaw) {
        if (!returnType) {
          errors.push('test cases require a return type');
        } else {
          const parsedTestCases = parseTestCasesCell(testCasesRaw, parameters, returnType);
          if (parsedTestCases.error) {
            errors.push(parsedTestCases.error);
          } else {
            testCases = parsedTestCases.testCases;
          }
        }
      }
    } else if (returnTypeRaw || parametersRaw || testCasesRaw) {
      errors.push('function name is required to use return type, parameters, or test cases');
    }

    return {
      rowNumber: dataIndex + 1,
      questionText,
      difficulty: difficulty ?? 'Easy',
      marks: Number.isFinite(marks) ? marks : 0,
      programmingLanguage,
      starterCode,
      sampleAnswer,
      allowLanguageChange,
      functionName,
      returnType,
      parameters,
      testCases,
      error: errors.length > 0 ? errors.join('; ') : null,
    };
  });
}
