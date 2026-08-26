import { Button, Form } from 'react-bootstrap';

let nextRowKey = 0;

export interface SqlTestCaseRow {
  key: number;
  setupSql: string;
}

export function newSqlTestCase(): SqlTestCaseRow {
  return { key: nextRowKey++, setupSql: '' };
}

interface SqlTestCaseEditorProps {
  value: SqlTestCaseRow[];
  onChange: (value: SqlTestCaseRow[]) => void;
}

// Sql questions have no function signature - each test case is just a
// fresh seeded database. There's no "expected output" field here because
// the expected result is always derived by running the Reference Query
// (the Sample Answer field above this editor) against the same Setup SQL,
// never hand-typed - see [[code_execution_testcases.txt]]'s Phase 7 notes.
export default function SqlTestCaseEditor({ value, onChange }: SqlTestCaseEditorProps) {
  const addTestCase = () => onChange([...value, newSqlTestCase()]);
  const removeTestCase = (key: number) => onChange(value.filter((tc) => tc.key !== key));
  const updateTestCase = (key: number, setupSql: string) =>
    onChange(value.map((tc) => (tc.key === key ? { ...tc, setupSql } : tc)));

  return (
    <div className="mb-3">
      <Form.Label className="fw-bold d-block">Sql Test Cases</Form.Label>
      <Form.Text className="text-muted d-block mb-2">
        Each test case gets its own fresh database - Setup SQL should create any tables and seed
        rows needed (CREATE TABLE + INSERT statements). The Reference Query above is run against
        this same setup to compute the expected result automatically.
      </Form.Text>
      {value.map((testCase, index) => (
        <div key={testCase.key} className="border rounded-3 p-3 mb-2">
          <Form.Group controlId={`sqlTestCaseSetup-${testCase.key}`}>
            <Form.Label className="small text-muted mb-1">Test Case {index + 1} - Setup SQL</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              className="font-monospace"
              placeholder={
                "CREATE TABLE students(id INTEGER, name TEXT, score REAL);\n" +
                "INSERT INTO students VALUES (1, 'Alice', 92.5), (2, 'Bob', 81.0);"
              }
              value={testCase.setupSql}
              onChange={(e) => updateTestCase(testCase.key, e.target.value)}
            />
          </Form.Group>
          <Button
            variant="link"
            size="sm"
            className="text-danger p-0 mt-1"
            onClick={() => removeTestCase(testCase.key)}
          >
            Remove Test Case
          </Button>
        </div>
      ))}
      <Button variant="outline-secondary" size="sm" onClick={addTestCase}>
        + Add Test Case
      </Button>
    </div>
  );
}
