import { Button, Col, Form, Row } from 'react-bootstrap';
import type { ParameterType } from '../types/question';
import { PARAMETER_TYPES } from '../types/question';
import { typedValuePlaceholder } from '../utils/typedValue';

let nextRowKey = 0;

export interface SignatureParameter {
  key: number;
  name: string;
  type: ParameterType;
}

export interface SignatureTestCase {
  key: number;
  argumentTexts: string[];
  expectedOutputText: string;
}

export interface FunctionSignatureValue {
  functionName: string;
  returnType: ParameterType | '';
  parameters: SignatureParameter[];
  testCases: SignatureTestCase[];
}

export const EMPTY_SIGNATURE: FunctionSignatureValue = {
  functionName: '',
  returnType: '',
  parameters: [],
  testCases: [],
};

function newParameter(): SignatureParameter {
  return { key: nextRowKey++, name: '', type: 'Int' };
}

function newTestCase(parameterCount: number): SignatureTestCase {
  return {
    key: nextRowKey++,
    argumentTexts: Array.from({ length: parameterCount }, () => ''),
    expectedOutputText: '',
  };
}

interface FunctionSignatureEditorProps {
  value: FunctionSignatureValue;
  onChange: (value: FunctionSignatureValue) => void;
}

// At least one test case is required for a question to be auto-graded;
// zero test cases (with or without a signature filled in) is still a
// valid choice - the question just stays manually graded.
export default function FunctionSignatureEditor({ value, onChange }: FunctionSignatureEditorProps) {
  const updateParameter = (key: number, updates: Partial<SignatureParameter>) => {
    onChange({
      ...value,
      parameters: value.parameters.map((p) => (p.key === key ? { ...p, ...updates } : p)),
    });
  };

  const addParameter = () => {
    onChange({
      ...value,
      parameters: [...value.parameters, newParameter()],
      testCases: value.testCases.map((tc) => ({ ...tc, argumentTexts: [...tc.argumentTexts, ''] })),
    });
  };

  const removeParameter = (index: number) => {
    onChange({
      ...value,
      parameters: value.parameters.filter((_, i) => i !== index),
      testCases: value.testCases.map((tc) => ({
        ...tc,
        argumentTexts: tc.argumentTexts.filter((_, i) => i !== index),
      })),
    });
  };

  const addTestCase = () => {
    onChange({ ...value, testCases: [...value.testCases, newTestCase(value.parameters.length)] });
  };

  const removeTestCase = (key: number) => {
    onChange({ ...value, testCases: value.testCases.filter((tc) => tc.key !== key) });
  };

  const updateTestCaseArgument = (key: number, index: number, text: string) => {
    onChange({
      ...value,
      testCases: value.testCases.map((tc) =>
        tc.key === key
          ? { ...tc, argumentTexts: tc.argumentTexts.map((a, i) => (i === index ? text : a)) }
          : tc,
      ),
    });
  };

  const updateTestCaseExpectedOutput = (key: number, text: string) => {
    onChange({
      ...value,
      testCases: value.testCases.map((tc) => (tc.key === key ? { ...tc, expectedOutputText: text } : tc)),
    });
  };

  return (
    <div className="mb-3">
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3" controlId="signatureFunctionName">
            <Form.Label className="fw-bold">Function Name (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. secondLargest"
              value={value.functionName}
              onChange={(e) => onChange({ ...value, functionName: e.target.value })}
            />
            <Form.Text className="text-muted">
              Set this to enable Run Code and auto-grading. Leave blank to keep this a manually graded question.
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3" controlId="signatureReturnType">
            <Form.Label className="fw-bold">Return Type</Form.Label>
            <Form.Select
              value={value.returnType}
              onChange={(e) => onChange({ ...value, returnType: e.target.value as ParameterType })}
              disabled={!value.functionName.trim()}
            >
              <option value="">Select a return type</option>
              {PARAMETER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {value.functionName.trim() && (
        <>
          <Form.Label className="fw-bold">Parameters</Form.Label>
          {value.parameters.map((param, index) => (
            <div key={param.key} className="d-flex align-items-center gap-2 mb-2">
              <Form.Control
                type="text"
                placeholder="Parameter name"
                value={param.name}
                onChange={(e) => updateParameter(param.key, { name: e.target.value })}
                style={{ maxWidth: 220 }}
              />
              <Form.Select
                value={param.type}
                onChange={(e) => updateParameter(param.key, { type: e.target.value as ParameterType })}
                style={{ maxWidth: 220 }}
              >
                {PARAMETER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
              <Button variant="link" className="text-danger" onClick={() => removeParameter(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="outline-secondary" size="sm" className="mb-3" onClick={addParameter}>
            + Add Parameter
          </Button>

          <Form.Label className="fw-bold d-block">Test Cases</Form.Label>
          <Form.Text className="text-muted d-block mb-2">
            One argument value per parameter, in order. Arrays are comma-separated (e.g. 12, 35, 1).
          </Form.Text>
          {value.testCases.map((testCase) => (
            <div key={testCase.key} className="border rounded-3 p-3 mb-2">
              <div className="d-flex flex-wrap gap-2 mb-2">
                {value.parameters.map((param, index) => (
                  <Form.Group key={param.key} style={{ minWidth: 180 }}>
                    <Form.Label className="small text-muted mb-1">{param.name || `arg${index + 1}`}</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder={typedValuePlaceholder(param.type)}
                      value={testCase.argumentTexts[index] ?? ''}
                      onChange={(e) => updateTestCaseArgument(testCase.key, index, e.target.value)}
                    />
                  </Form.Group>
                ))}
                <Form.Group style={{ minWidth: 180 }}>
                  <Form.Label className="small text-muted mb-1">Expected Output</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder={value.returnType ? typedValuePlaceholder(value.returnType) : ''}
                    value={testCase.expectedOutputText}
                    onChange={(e) => updateTestCaseExpectedOutput(testCase.key, e.target.value)}
                  />
                </Form.Group>
              </div>
              <Button variant="link" size="sm" className="text-danger p-0" onClick={() => removeTestCase(testCase.key)}>
                Remove Test Case
              </Button>
            </div>
          ))}
          <Button variant="outline-secondary" size="sm" onClick={addTestCase}>
            + Add Test Case
          </Button>
        </>
      )}
    </div>
  );
}
