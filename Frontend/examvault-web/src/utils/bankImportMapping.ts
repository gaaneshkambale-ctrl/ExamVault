import type { DraftQuestion } from '../types/ai';
import type { SaveBankQuestionRequest, BankQuestionStatus } from '../types/questionBank';
import type { CsvCodeImportRow, CsvImportRow } from './csvQuestionImport';

// Where imported / generated questions land in the bank. Chosen once per
// import or generation run and applied to every question in it.
export interface BankDestination {
  subjectId: string;
  topicId: string | null;
  status: BankQuestionStatus;
}

const base = (dest: BankDestination) => ({
  subjectId: dest.subjectId,
  topicId: dest.topicId,
  status: dest.status,
  negativeMarks: 0,
  tagIds: [] as string[],
});

export function bankRequestFromStandardRow(row: CsvImportRow, dest: BankDestination): SaveBankQuestionRequest {
  return {
    ...base(dest),
    questionType: row.questionType === 'CodeProgram' ? 'MultipleChoice' : row.questionType,
    questionText: row.questionText,
    difficulty: row.difficulty,
    defaultMarks: row.marks,
    shuffleOptions: row.shuffleOptions,
    options: row.options,
  };
}

export function bankRequestFromCodeRow(row: CsvCodeImportRow, dest: BankDestination): SaveBankQuestionRequest {
  return {
    ...base(dest),
    questionType: 'CodeProgram',
    questionText: row.questionText,
    difficulty: row.difficulty,
    defaultMarks: row.marks,
    shuffleOptions: false,
    options: [],
    starterCode: row.starterCode || null,
    programmingLanguage: row.programmingLanguage,
    allowLanguageChange: row.allowLanguageChange,
    sampleAnswer: row.sampleAnswer || null,
    functionName: row.functionName || null,
    returnType: row.returnType,
    parameters: row.parameters,
    testCases: row.testCases,
    sqlTestCases: row.sqlTestCases,
    sampleInput: row.sampleInput || null,
    sampleOutput: row.sampleOutput || null,
    constraints: row.constraints || null,
  };
}

// AI drafts always land in the bank as Drafts unless the caller says otherwise:
// generated text should be read by a person before it can go into an exam.
export function bankRequestFromAiDraft(draft: DraftQuestion, dest: BankDestination): SaveBankQuestionRequest {
  return {
    ...base(dest),
    questionType: draft.questionType,
    questionText: draft.questionText,
    difficulty: draft.difficulty,
    defaultMarks: draft.marks,
    shuffleOptions: false,
    options: draft.options,
  };
}
