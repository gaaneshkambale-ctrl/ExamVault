import { useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Table } from 'react-bootstrap';
import { createQuestion } from '../api/questionApi';
import { createBankQuestion } from '../api/questionBankApi';
import { bankRequestFromCodeRow, bankRequestFromStandardRow } from '../utils/bankImportMapping';
import type { BankDestination } from '../utils/bankImportMapping';
import { IMPORT_FILE_ACCEPT, importFileToCsvText } from '../utils/importFile';
import {
  buildCodeCsvTemplate,
  buildCsvTemplate,
  parseCodeQuestionImportCsv,
  parseQuestionImportCsv,
} from '../utils/csvQuestionImport';
import type { CsvCodeImportRow, CsvImportRow } from '../utils/csvQuestionImport';
import { extractServerError } from '../utils/apiError';
import { PROGRAMMING_LANGUAGES } from '../types/question';
import type { QuestionResponse, QuestionType } from '../types/question';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

const PROGRAMMING_LANGUAGE_LABELS = Object.fromEntries(PROGRAMMING_LANGUAGES.map((l) => [l.value, l.label]));

type ImportKind = 'standard' | 'code';

// Code/Programming questions have an entirely different field set (no
// Options/Correct Answer - a programming language, starter code, reference
// solution, and an optional function signature/test cases instead), so they
// need their own template rather than trying to force both shapes into one
// generic CSV - see CsvCodeImportRow's own comment for the signature fields'
// encoding and what's still deliberately left out (Sql setup scripts).
type AnyRow =
  | { kind: 'standard'; row: CsvImportRow }
  | { kind: 'code'; row: CsvCodeImportRow };

// Two destinations: an exam (creates exam questions, the original use) or the
// organization's Question Bank (creates bank questions under one chosen
// subject/topic/status). Same parsing, validation and preview either way.
type CsvImportPanelProps =
  | { examId: string; onImported: (questions: QuestionResponse[]) => void; bank?: undefined }
  | { bank: { destination: BankDestination; onImported: (importedCount: number) => void }; examId?: undefined; onImported?: undefined };

function downloadTemplate(kind: ImportKind) {
  const content = kind === 'code' ? buildCodeCsvTemplate() : buildCsvTemplate();
  const filename = kind === 'code' ? 'code-question-import-template.csv' : 'question-import-template.csv';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CsvImportPanel({ examId, onImported, bank }: CsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importKind, setImportKind] = useState<ImportKind>('standard');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const validCount = rows.filter((r) => r.row.error === null).length;
  const invalidCount = rows.length - validCount;

  const changeImportKind = (kind: ImportKind) => {
    setImportKind(kind);
    setFileName('');
    setRows([]);
    setSelectedRows(new Set());
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setFileName(file.name);
    let text: string;
    try {
      text = await importFileToCsvText(file);
    } catch (error) {
      setRows([]);
      setSelectedRows(new Set());
      setImportError(error instanceof Error ? error.message : 'That file could not be read.');
      return;
    }
    const parsed: AnyRow[] =
      importKind === 'code'
        ? parseCodeQuestionImportCsv(text).map((row) => ({ kind: 'code' as const, row }))
        : parseQuestionImportCsv(text).map((row) => ({ kind: 'standard' as const, row }));
    setRows(parsed);
    setSelectedRows(new Set(parsed.filter((r) => r.row.error === null).map((r) => r.row.rowNumber)));
  };

  const selectAllValid = () =>
    setSelectedRows(new Set(rows.filter((r) => r.row.error === null).map((r) => r.row.rowNumber)));

  const clearAllSelected = () => setSelectedRows(new Set());

  const toggleRow = (rowNumber: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.row.error === null && selectedRows.has(r.row.rowNumber));
    if (toImport.length === 0) return;

    setImporting(true);
    setImportError('');

    // Exam import keeps its original fire-everything-at-once behaviour; bank
    // import goes in small batches so a big file does not open hundreds of
    // simultaneous requests (each one is an audited write).
    const saveEntry = (entry: AnyRow): Promise<unknown> =>
      bank
        ? createBankQuestion(
            entry.kind === 'code'
              ? bankRequestFromCodeRow(entry.row, bank.destination)
              : bankRequestFromStandardRow(entry.row, bank.destination),
          )
        : saveExamEntry(entry);

    const saveExamEntry = (entry: AnyRow): Promise<QuestionResponse> =>
      entry.kind === 'code'
          ? createQuestion({
              examId: examId!,
              questionType: 'CodeProgram',
              questionText: entry.row.questionText,
              marks: entry.row.marks,
              difficulty: entry.row.difficulty,
              shuffleOptions: false,
              options: [],
              starterCode: entry.row.starterCode || null,
              programmingLanguage: entry.row.programmingLanguage,
              allowLanguageChange: entry.row.allowLanguageChange,
              sampleAnswer: entry.row.sampleAnswer || null,
              functionName: entry.row.functionName || null,
              returnType: entry.row.returnType,
              parameters: entry.row.parameters,
              testCases: entry.row.testCases,
              sqlTestCases: entry.row.sqlTestCases,
              sampleInput: entry.row.sampleInput || null,
              sampleOutput: entry.row.sampleOutput || null,
              constraints: entry.row.constraints || null,
            })
          : createQuestion({
              examId: examId!,
              questionType: entry.row.questionType,
              questionText: entry.row.questionText,
              marks: entry.row.marks,
              difficulty: entry.row.difficulty,
              shuffleOptions: entry.row.shuffleOptions,
              options: entry.row.options,
            });

    const batchSize = bank ? 5 : toImport.length;
    const results: PromiseSettledResult<unknown>[] = [];
    for (let start = 0; start < toImport.length; start += batchSize) {
      results.push(...(await Promise.allSettled(toImport.slice(start, start + batchSize).map(saveEntry))));
    }

    const created = results
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
      .map((r) => r.value);
    const failed = results.filter((r) => r.status === 'rejected');

    setImporting(false);

    if (failed.length > 0) {
      const firstError = failed[0] as PromiseRejectedResult;
      setImportError(
        `${failed.length} of ${toImport.length} question(s) failed to import: ${extractServerError(firstError.reason)}`,
      );
    }

    if (bank) {
      // Drop the rows that already made it in, so fixing the file's problem
      // rows and retrying can never create the successful ones twice.
      const importedRowNumbers = new Set(
        toImport.filter((_, i) => results[i].status === 'fulfilled').map((entry) => entry.row.rowNumber),
      );
      if (importedRowNumbers.size > 0) {
        setRows((prev) => prev.filter((entry) => !importedRowNumbers.has(entry.row.rowNumber)));
        setSelectedRows((prev) => new Set([...prev].filter((n) => !importedRowNumbers.has(n))));
        bank.onImported(importedRowNumbers.size);
      }
      return;
    }

    if (created.length > 0) {
      onImported!(created as QuestionResponse[]);
    }
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label className="fw-bold mb-1">Question Format</Form.Label>
        <div className="d-flex gap-3">
          <Form.Check
            type="radio"
            id="importKindStandard"
            name="importKind"
            label="Standard (Single/Multiple Choice, True-False)"
            checked={importKind === 'standard'}
            onChange={() => changeImportKind('standard')}
          />
          <Form.Check
            type="radio"
            id="importKindCode"
            name="importKind"
            label="Code / Programming"
            checked={importKind === 'code'}
            onChange={() => changeImportKind('code')}
          />
        </div>
      </Form.Group>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Form.Label className="fw-bold mb-1">Upload CSV or Excel (.xlsx)</Form.Label>
          <div className="text-muted small">
            {importKind === 'code' ? (
              <>
                Header row required: Question Text, Difficulty, Marks, Programming Language, Starter Code, Sample
                Answer / Reference Query, Allow Language Change, Function Name, Return Type, Parameters, Test Cases,
                Sql Test Cases. Function Name/Return Type/Parameters/Test Cases are for auto-grading C#, Java,
                Python, C++, or JavaScript (leave all blank for a manually graded question); Sql Test Cases is for
                SQL questions instead - the other four don't apply there, and vice versa.
                Parameters: <code>name:type</code> pairs separated by <code>;</code> (e.g.{' '}
                <code>arr:IntArray;target:Int</code>). Test Cases: one argument per parameter separated by{' '}
                <code>|</code>, then <code>=&gt;</code> and the expected output, multiple cases separated by{' '}
                <code>;</code> (e.g. <code>2|3=&gt;5;10|20=&gt;30</code>); array arguments are comma-separated (e.g.{' '}
                <code>1,2,3</code>). Sql Test Cases: one Setup SQL script per test case (
                <code>CREATE TABLE ...; INSERT INTO ...;</code>) - Expected Output is computed automatically from
                the Reference Query, never entered by hand; multiple test cases are separated by a line containing
                only <code>---</code>. Only the first Setup SQL block is shown to students, as the schema above the
                editor and as the query result they see after running - any later blocks are hidden checks that
                only ever show up as an extra Passed/Failed count, never their own schema or data.
              </>
            ) : (
              'Header row required: Question Text, Type, Difficulty, Marks, Option A, Option B, ... (add as many ' +
              'Option <letter> columns as you need - not limited to four), Correct Answer, Shuffle Options.'
            )}
          </div>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => downloadTemplate(importKind)}>
          Download Template
        </Button>
      </div>

      <Form.Control
        ref={fileInputRef}
        type="file"
        accept={IMPORT_FILE_ACCEPT}
        onChange={(e) => void handleFileChange(e as React.ChangeEvent<HTMLInputElement>)}
      />

      {importError && (
        <Alert variant="danger" className="mt-3">
          {importError}
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <div className="d-flex align-items-center gap-3 mt-3 mb-2">
            <div className="fw-bold">{fileName}</div>
            <Badge bg="success">{validCount} valid</Badge>
            {invalidCount > 0 && <Badge bg="danger">{invalidCount} invalid</Badge>}
            <div className="ms-auto d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={selectedRows.size === validCount}
                onClick={selectAllValid}
              >
                Select All
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={selectedRows.size === 0}
                onClick={clearAllSelected}
              >
                Clear All
              </Button>
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <Table size="sm" hover className="align-middle mb-0">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>#</th>
                  <th>Question</th>
                  <th>{importKind === 'code' ? 'Language' : 'Type'}</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.row.rowNumber} className={entry.row.error ? 'table-danger' : undefined}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        disabled={!!entry.row.error}
                        checked={selectedRows.has(entry.row.rowNumber)}
                        onChange={() => toggleRow(entry.row.rowNumber)}
                      />
                    </td>
                    <td>{entry.row.rowNumber}</td>
                    <td>
                      {entry.row.questionText || <span className="text-muted">(no text)</span>}
                      {entry.row.error && <div className="text-danger small">{entry.row.error}</div>}
                    </td>
                    <td>
                      {entry.kind === 'code'
                        ? (entry.row.programmingLanguage && PROGRAMMING_LANGUAGE_LABELS[entry.row.programmingLanguage]) || '—'
                        : QUESTION_TYPE_LABELS[entry.row.questionType]}
                    </td>
                    <td>{entry.row.marks}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <Button
              variant="primary"
              disabled={importing || selectedRows.size === 0}
              onClick={() => void handleImport()}
            >
              {importing ? 'Importing...' : `Import Selected (${selectedRows.size})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
