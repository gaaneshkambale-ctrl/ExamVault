import { useRef, useState } from 'react';
import { Alert, Badge, Button, Form, Table } from 'react-bootstrap';
import { createQuestion } from '../api/questionApi';
import { buildCsvTemplate, parseQuestionImportCsv } from '../utils/csvQuestionImport';
import { extractServerError } from '../utils/apiError';
import type { QuestionResponse, QuestionType } from '../types/question';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

interface CsvImportPanelProps {
  examId: string;
  onImported: (questions: QuestionResponse[]) => void;
}

function downloadTemplate() {
  const blob = new Blob([buildCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'question-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CsvImportPanel({ examId, onImported }: CsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ReturnType<typeof parseQuestionImportCsv>>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const validCount = rows.filter((r) => r.error === null).length;
  const invalidCount = rows.length - validCount;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseQuestionImportCsv(text);
    setRows(parsed);
    setSelectedRows(new Set(parsed.filter((r) => r.error === null).map((r) => r.rowNumber)));
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
    const toImport = rows.filter((r) => r.error === null && selectedRows.has(r.rowNumber));
    if (toImport.length === 0) return;

    setImporting(true);
    setImportError('');

    const results = await Promise.allSettled(
      toImport.map((row) =>
        createQuestion({
          examId,
          questionType: row.questionType,
          questionText: row.questionText,
          marks: row.marks,
          difficulty: row.difficulty,
          shuffleOptions: row.shuffleOptions,
          options: row.options,
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Form.Label className="fw-bold mb-1">Upload CSV</Form.Label>
          <div className="text-muted small">
            Header row required: Question Text, Type, Difficulty, Marks, Option A-D, Correct
            Answer, Shuffle Options.
          </div>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>
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
              <thead className="text-muted small text-uppercase table-light">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className={row.error ? 'table-danger' : undefined}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        disabled={!!row.error}
                        checked={selectedRows.has(row.rowNumber)}
                        onChange={() => toggleRow(row.rowNumber)}
                      />
                    </td>
                    <td>{row.rowNumber}</td>
                    <td>
                      {row.questionText || <span className="text-muted">(no text)</span>}
                      {row.error && <div className="text-danger small">{row.error}</div>}
                    </td>
                    <td>{QUESTION_TYPE_LABELS[row.questionType]}</td>
                    <td>{row.marks}</td>
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
