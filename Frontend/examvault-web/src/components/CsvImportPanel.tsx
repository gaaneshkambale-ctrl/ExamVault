import { useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Table } from 'react-bootstrap';
import { createQuestion } from '../api/questionApi';
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
// solution instead), so they need their own template rather than trying to
// force both shapes into one generic CSV - see CsvCodeImportRow's own
// comment for what's deliberately left out of it (test cases/signature).
type AnyRow =
  | { kind: 'standard'; row: CsvImportRow }
  | { kind: 'code'; row: CsvCodeImportRow };

interface CsvImportPanelProps {
  examId: string;
  onImported: (questions: QuestionResponse[]) => void;
}

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

export default function CsvImportPanel({ examId, onImported }: CsvImportPanelProps) {
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
    const text = await file.text();
    const parsed: AnyRow[] =
      importKind === 'code'
        ? parseCodeQuestionImportCsv(text).map((row) => ({ kind: 'code' as const, row }))
        : parseQuestionImportCsv(text).map((row) => ({ kind: 'standard' as const, row }));
    setRows(parsed);
    setSelectedRows(new Set(parsed.filter((r) => r.row.error === null).map((r) => r.row.rowNumber)));
  };

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

    const results = await Promise.allSettled(
      toImport.map((entry) =>
        entry.kind === 'code'
          ? createQuestion({
              examId,
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
            })
          : createQuestion({
              examId,
              questionType: entry.row.questionType,
              questionText: entry.row.questionText,
              marks: entry.row.marks,
              difficulty: entry.row.difficulty,
              shuffleOptions: entry.row.shuffleOptions,
              options: entry.row.options,
            }),
      ),
    );

    const created = results
      .filter((r): r is PromiseFulfilledResult<QuestionResponse> => r.status === 'fulfilled')
      .map((r) => r.value);
    const failed = results.filter((r) => r.status === 'rejected');

    setImporting(false);

    if (failed.length > 0) {
      const firstError = failed[0] as PromiseRejectedResult;
      setImportError(
        `${failed.length} of ${toImport.length} question(s) failed to import: ${extractServerError(firstError.reason)}`,
      );
    }

    if (created.length > 0) {
      onImported(created);
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
          <Form.Label className="fw-bold mb-1">Upload CSV</Form.Label>
          <div className="text-muted small">
            {importKind === 'code'
              ? 'Header row required: Question Text, Difficulty, Marks, Programming Language, Starter Code, Sample Answer / Reference Query, Allow Language Change. Test cases are added afterward via Edit Question.'
              : 'Header row required: Question Text, Type, Difficulty, Marks, Option A-D, Correct Answer, Shuffle Options.'}
          </div>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => downloadTemplate(importKind)}>
          Download Template
        </Button>
      </div>

      <Form.Control
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
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
