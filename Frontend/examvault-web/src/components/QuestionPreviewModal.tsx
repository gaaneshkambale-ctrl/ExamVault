import { Badge, Form, Modal } from 'react-bootstrap';
import type { ReactNode } from 'react';
import type { QuestionResponse, QuestionType } from '../types/question';
import { PROGRAMMING_LANGUAGES } from '../types/question';
import { formatTypedValue } from '../utils/typedValue';
import { buildFunctionSignature } from '../utils/functionSignature';
import { parseSqlSetup, parseSqlRowSet, toSqlTableRows } from '../utils/sqlSetupParser';
import DataTable from './DataTable';

interface QuestionPreviewModalProps {
  question: QuestionResponse | null;
  onHide: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

const DIFFICULTY_BADGE: Record<'Easy' | 'Medium' | 'Hard', string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

function languageLabel(language: string | null | undefined): string {
  return PROGRAMMING_LANGUAGES.find((l) => l.value === language)?.label ?? language ?? '—';
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 1 1-5.66 5.66L2 19l3 3 7.04-7.04a4 4 0 1 1 5.66-5.66l-3-3z" />
    </svg>
  );
}

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="d-flex align-items-center gap-2 fw-bold small mb-2 text-primary-emphasis">
      {icon}
      {children}
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3 overflow-hidden mb-3 border">
      <div className="px-3 py-2 fw-bold small bg-primary-subtle text-primary-emphasis">{title}</div>
      <div className="bg-body overflow-x-auto">{children}</div>
    </div>
  );
}

// Mirrors the actual option-row markup students see in TakeExam.tsx (label + radio/
// checkbox + lettered option), and reuses that same page's real SQL setup/expected-
// output parsing and DataTable rendering (via the shared sqlSetupParser/DataTable
// modules) - so this preview is a faithful look at real, structured data, not a
// data dump (the existing Question Details page already covers that) and not a
// raw-SQL-text approximation of what's really a table.
export default function QuestionPreviewModal({ question, onHide }: QuestionPreviewModalProps) {
  if (!question) return null;
  const isCode = question.questionType === 'CodeProgram';
  const isSql = question.programmingLanguage === 'Sql';
  const isMultiSelect = question.questionType === 'MultiSelect';
  const setupSql = question.sqlTestCases?.[0]?.setupSql;
  const expectedOutput = question.sqlTestCases?.[0]?.expectedOutput;
  const parameters = question.parameters ?? [];

  const parsedSetupTables = isSql && setupSql ? parseSqlSetup(setupSql) : null;
  const parsedExpectedOutput = isSql && expectedOutput != null ? parseSqlRowSet(expectedOutput) : null;

  // Real per-question test cases (the same values used for auto-grading), one column
  // per parameter plus an Output column - falls back to the single sampleInput/
  // sampleOutput pair when a question has no structured test cases yet.
  const exampleColumns = !isSql && parameters.length > 0 ? [...parameters.map((p) => p.name), 'Output'] : ['Input', 'Output'];
  const exampleRows: string[][] =
    !isSql && question.testCases && question.testCases.length > 0
      ? question.testCases.map((tc) => [
          ...tc.arguments.map((arg, i) => formatTypedValue(arg, parameters[i]?.type ?? 'String')),
          question.returnType ? formatTypedValue(tc.expectedOutput, question.returnType) : String(tc.expectedOutput),
        ])
      : !isSql && (question.sampleInput || question.sampleOutput)
        ? [[question.sampleInput ?? '', question.sampleOutput ?? '']]
        : [];

  const signature = isCode && !isSql
    ? buildFunctionSignature({
        functionName: question.functionName ?? '',
        returnType: question.returnType,
        parameters: parameters.map((p) => ({ name: p.name, type: p.type })),
        language: question.programmingLanguage,
      })
    : null;

  return (
    <Modal show={!!question} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <div>
          <Modal.Title className="h6 mb-0">Question Preview</Modal.Title>
          <div className="text-muted small">This is how the question will appear to students during the exam.</div>
        </div>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center gap-2 mb-3">
          <Badge bg="secondary">{QUESTION_TYPE_LABELS[question.questionType]}</Badge>
          <Badge bg={DIFFICULTY_BADGE[question.difficulty]}>{question.difficulty}</Badge>
          <span className="text-muted small">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </span>
        </div>

        {isCode ? (
          <>
            <h2 className="h6 fw-bold mb-1">{isSql ? 'SQL Question' : 'Coding Question'}</h2>
            <p className="fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
              {question.questionText}
            </p>

            {!isSql && (
              <div className="text-muted small mb-3">
                Language: {languageLabel(question.programmingLanguage)}
                {question.allowLanguageChange ? ' (student may change it)' : ''}
              </div>
            )}

            {isSql && setupSql && (
              <div className="mb-3">
                <div className="fw-medium mb-1 small">
                  Use the following {parsedSetupTables && parsedSetupTables.length > 1 ? 'tables' : 'table'}:
                </div>
                {parsedSetupTables ? (
                  <div className="d-flex flex-column gap-2 mb-2">
                    {parsedSetupTables.map((table) => (
                      <div key={table.tableName}>
                        <div className="fw-bold mb-1 small">{table.tableName}</div>
                        <div className="overflow-x-auto">
                          <DataTable columns={table.columns} rows={table.rows} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <TableCard title="Setup SQL">
                    <pre className="mb-0 small text-body px-3 py-2" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {setupSql}
                    </pre>
                  </TableCard>
                )}
              </div>
            )}

            {isSql && expectedOutput != null && (
              <TableCard title="Expected Output">
                {parsedExpectedOutput === null ? (
                  <pre className="mb-0 small px-3 py-2 text-body" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {expectedOutput}
                  </pre>
                ) : parsedExpectedOutput.rows.length === 0 ? (
                  <div className="text-muted small px-3 py-2">No rows returned</div>
                ) : (
                  <DataTable columns={parsedExpectedOutput.columns} rows={toSqlTableRows(parsedExpectedOutput)} bordered={false} />
                )}
              </TableCard>
            )}

            {isSql && !setupSql && expectedOutput == null && (question.sampleInput || question.sampleOutput) && (
              <div className="mb-3">
                <SectionHeading icon={<InfoIcon />}>Sample Input and Output</SectionHeading>
                <DataTable columns={['Sample Input', 'Sample Output']} rows={[[question.sampleInput ?? '', question.sampleOutput ?? '']]} />
              </div>
            )}

            {!isSql && exampleRows.length > 0 && (
              <div className="mb-3">
                <SectionHeading icon={<InfoIcon />}>Example</SectionHeading>
                <DataTable columns={exampleColumns} rows={exampleRows} />
              </div>
            )}

            {question.constraints && (
              <div className="mb-3">
                <SectionHeading icon={<BarsIcon />}>{isSql ? 'Notes' : 'Constraints'}</SectionHeading>
                <ul className="small mb-0">
                  {question.constraints
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                </ul>
              </div>
            )}

            {signature && (
              <div className="mb-3">
                <SectionHeading icon={<WrenchIcon />}>Function Signature</SectionHeading>
                <pre className="bg-body-tertiary border rounded p-3 mb-0 small">{signature}</pre>
              </div>
            )}

            {!isSql && question.starterCode && (
              <div>
                <div className="text-muted small mb-1">Starter Code</div>
                <pre className="bg-body-tertiary border rounded p-3 mb-0 small">{question.starterCode}</pre>
              </div>
            )}

            <div className="text-muted small fst-italic mt-3">
              Students answer in a live code editor here{isSql ? ' and can run their query against the table above' : ' and can run/test their code'} - not shown in this preview.
            </div>
          </>
        ) : (
          <>
            <p className="fw-medium mb-3" style={{ whiteSpace: 'pre-wrap' }}>
              {question.questionText}
            </p>
            <Form>
              {question.options.map((option, index) => (
                <label
                  key={option.id}
                  className={`d-flex align-items-center gap-2 border rounded-3 px-3 py-2 mb-2${option.isCorrect ? ' bg-success-subtle' : ''}`}
                  style={{ borderColor: option.isCorrect ? '#16a34a' : undefined }}
                >
                  <Form.Check type={isMultiSelect ? 'checkbox' : 'radio'} checked={false} disabled readOnly className="mb-0" />
                  <span className="flex-grow-1">
                    {OPTION_LETTERS[index] ?? index + 1}. {option.optionText}
                  </span>
                  {option.isCorrect && (
                    <Badge bg="success" className="flex-shrink-0">
                      Correct Answer
                    </Badge>
                  )}
                </label>
              ))}
            </Form>
            {question.shuffleOptions && (
              <div className="text-muted small fst-italic mt-2">Option order is shuffled per student.</div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
