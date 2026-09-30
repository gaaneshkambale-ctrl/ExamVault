import { Col, Form, Row } from 'react-bootstrap';
import FunctionSignatureEditor from './FunctionSignatureEditor';
import SqlTestCaseEditor from './SqlTestCaseEditor';
import { PROGRAMMING_LANGUAGES } from '../types/question';
import type { ProgrammingLanguage } from '../types/question';
import type { CodeFormState } from '../utils/bankCode';

interface BankCodeFieldsProps {
  value: CodeFormState;
  onChange: (value: CodeFormState) => void;
}

// The Code/Programming half of the Question Bank form: same fields as the
// exam-question form (starter/sample code, language, signature + test cases,
// or Sql setup + reference query), so a bank question copies into an exam
// with nothing lost.
export default function BankCodeFields({ value, onChange }: BankCodeFieldsProps) {
  const isSql = value.programmingLanguage === 'Sql';
  const set = <K extends keyof CodeFormState>(key: K, next: CodeFormState[K]) => onChange({ ...value, [key]: next });

  return (
    <>
      <Row className="g-3 mb-3">
        <Col md={6}>
          <Form.Group controlId="bank-code-language">
            <Form.Label className="fw-bold">Programming Language *</Form.Label>
            <Form.Select
              value={value.programmingLanguage}
              onChange={(e) => set('programmingLanguage', e.target.value as ProgrammingLanguage)}
            >
              <option value="" disabled>
                Select a language
              </option>
              {PROGRAMMING_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex align-items-end">
          <Form.Check
            id="bank-code-allow-language"
            type="checkbox"
            label="Allow student to select language"
            checked={value.allowLanguageChange}
            onChange={(e) => set('allowLanguageChange', e.target.checked)}
          />
        </Col>
      </Row>

      <Form.Group className="mb-3" controlId="bank-code-starter">
        <Form.Label className="fw-bold">Starter Code (optional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          className="font-monospace"
          placeholder="Boilerplate shown to the student when they open this question"
          value={value.starterCode}
          onChange={(e) => set('starterCode', e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="bank-code-sample-answer">
        <Form.Label className="fw-bold">{isSql ? 'Reference Query (required for Sql test cases)' : 'Sample Answer (optional)'}</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          className="font-monospace"
          placeholder={isSql ? 'e.g. SELECT name, score FROM students WHERE score > 85;' : 'Reference solution for grading - students never see this'}
          value={value.sampleAnswer}
          onChange={(e) => set('sampleAnswer', e.target.value)}
        />
        <Form.Text className="text-muted">
          {isSql
            ? 'Used to compute the expected result for each Sql test case - never shown to students.'
            : 'For the grading admin only - students never see this.'}
        </Form.Text>
      </Form.Group>

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Form.Group controlId="bank-code-sample-input">
            <Form.Label className="fw-bold">Sample Input (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              className="font-monospace"
              value={value.sampleInput}
              onChange={(e) => set('sampleInput', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="bank-code-sample-output">
            <Form.Label className="fw-bold">Sample Output (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              className="font-monospace"
              value={value.sampleOutput}
              onChange={(e) => set('sampleOutput', e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3" controlId="bank-code-constraints">
        <Form.Label className="fw-bold">{isSql ? 'Notes (optional)' : 'Constraints (optional)'}</Form.Label>
        <Form.Control as="textarea" rows={3} value={value.constraints} onChange={(e) => set('constraints', e.target.value)} />
        <Form.Text className="text-muted">One per line - shown as bullet points to students.</Form.Text>
      </Form.Group>

      <hr />
      {isSql ? (
        <SqlTestCaseEditor value={value.sqlTestCases} onChange={(rows) => set('sqlTestCases', rows)} />
      ) : (
        <FunctionSignatureEditor value={value.signature} onChange={(signature) => set('signature', signature)} />
      )}
    </>
  );
}
