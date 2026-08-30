import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Col, Form, Modal, Nav, Row, Spinner } from 'react-bootstrap';
import { createQuestion } from '../api/questionApi';
import CsvImportPanel from './CsvImportPanel';
import { validateCreateQuestion } from '../utils/createQuestionValidation';
import { extractServerError } from '../utils/apiError';
import type {
  CreateQuestionOptionRequest,
  CreateQuestionRequest,
  ProgrammingLanguage,
  QuestionDifficulty,
  QuestionResponse,
  QuestionType,
} from '../types/question';
import { PROGRAMMING_LANGUAGES } from '../types/question';
import FunctionSignatureEditor, { EMPTY_SIGNATURE } from './FunctionSignatureEditor';
import type { FunctionSignatureValue } from './FunctionSignatureEditor';
import SqlTestCaseEditor from './SqlTestCaseEditor';
import type { SqlTestCaseRow } from './SqlTestCaseEditor';
import { parseTypedValue } from '../utils/typedValue';

let nextOptionKey = 0;

interface OptionFormState extends CreateQuestionOptionRequest {
  key: number;
}

function newOption(): OptionFormState {
  return { key: nextOptionKey++, optionText: '', isCorrect: false };
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function trueFalseOptions(): OptionFormState[] {
  return [
    { key: nextOptionKey++, optionText: 'True', isCorrect: false },
    { key: nextOptionKey++, optionText: 'False', isCorrect: false },
  ];
}

interface CreateQuestionModalProps {
  examId: string;
  sectionName?: string;
  defaultMarks?: number;
  allowImport?: boolean;
  show: boolean;
  onClose: () => void;
  onCreated: (questions: QuestionResponse[]) => void;
}

export default function CreateQuestionModal({
  examId,
  sectionName,
  defaultMarks,
  allowImport = false,
  show,
  onClose,
  onCreated,
}: CreateQuestionModalProps) {
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [questionType, setQuestionType] = useState<QuestionType>('MultipleChoice');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(defaultMarks ?? 1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [options, setOptions] = useState<OptionFormState[]>([newOption(), newOption()]);
  const [starterCode, setStarterCode] = useState('');
  const [programmingLanguage, setProgrammingLanguage] = useState<ProgrammingLanguage | ''>('');
  const [allowLanguageChange, setAllowLanguageChange] = useState(false);
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [signature, setSignature] = useState<FunctionSignatureValue>(EMPTY_SIGNATURE);
  const [sqlTestCases, setSqlTestCases] = useState<SqlTestCaseRow[]>([]);
  const isSql = programmingLanguage === 'Sql';
  const [errors, setErrors] = useState<ReturnType<typeof validateCreateQuestion>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  // The section's planned Marks / Question Count gives a sensible per-question default -
  // re-apply it each time the modal opens, since defaultMarks can change between opens.
  useEffect(() => {
    if (show) {
      setMarks(defaultMarks ?? 1);
      setMode('manual');
    }
  }, [show, defaultMarks]);

  const reset = () => {
    setQuestionType('MultipleChoice');
    setQuestionText('');
    setMarks(defaultMarks ?? 1);
    setDifficulty('Easy');
    setShuffleOptions(false);
    setOptions([newOption(), newOption()]);
    setStarterCode('');
    setProgrammingLanguage('');
    setAllowLanguageChange(false);
    setSampleAnswer('');
    setSignature(EMPTY_SIGNATURE);
    setSqlTestCases([]);
    setErrors({});
    setStatus('idle');
    setServerError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const changeQuestionType = (type: QuestionType) => {
    setQuestionType(type);
    setOptions(type === 'TrueFalse' ? trueFalseOptions() : [newOption(), newOption()]);
  };

  const updateOptionText = (key: number, text: string) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, optionText: text } : o)));
  };

  const markCorrect = (key: number) => {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));
  };

  // MultiSelect only - toggles just this option, unlike markCorrect above
  // which clears every other option (Single Choice/True-False can only
  // ever have one correct answer).
  const toggleCorrect = (key: number) => {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, isCorrect: !o.isCorrect } : o)));
  };

  const addOption = () => setOptions((prev) => [...prev, newOption()]);

  const removeOption = (key: number) =>
    setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.key !== key) : prev));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const form: CreateQuestionRequest =
      questionType === 'CodeProgram'
        ? {
            examId,
            questionType,
            questionText,
            marks,
            difficulty,
            shuffleOptions: false,
            options: [],
            starterCode: starterCode || null,
            programmingLanguage: programmingLanguage || null,
            allowLanguageChange,
            sampleAnswer: sampleAnswer || null,
            functionName: isSql ? null : signature.functionName.trim() || null,
            returnType: isSql ? null : signature.returnType || null,
            parameters: isSql ? [] : signature.parameters.map(({ name, type }) => ({ name, type })),
            testCases: isSql
              ? []
              : signature.testCases.map((tc) => ({
                  arguments: tc.argumentTexts.map((text, i) => parseTypedValue(text, signature.parameters[i].type)),
                  expectedOutput: parseTypedValue(tc.expectedOutputText, signature.returnType || 'String'),
                })),
            sqlTestCases: isSql ? sqlTestCases.map(({ setupSql }) => ({ setupSql })) : [],
          }
        : {
            examId,
            questionType,
            questionText,
            marks,
            difficulty,
            shuffleOptions,
            options: options.map(({ optionText, isCorrect }) => ({ optionText, isCorrect })),
          };

    const validationErrors = validateCreateQuestion(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      const created = await createQuestion(form);
      reset();
      onCreated([created]);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <div>
          <Modal.Title>Create Question</Modal.Title>
          {sectionName && <div className="text-muted small mt-1">Section: {sectionName}</div>}
        </div>
      </Modal.Header>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Body>
          {allowImport && (
            <Nav
              variant="tabs"
              activeKey={mode}
              onSelect={(key) => setMode((key as 'manual' | 'import') ?? 'manual')}
              className="mb-3"
            >
              <Nav.Item>
                <Nav.Link eventKey="manual">Manual Entry</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="import">Import CSV</Nav.Link>
              </Nav.Item>
            </Nav>
          )}

          {mode === 'import' ? (
            <CsvImportPanel
              examId={examId}
              onImported={(questions) => {
                reset();
                onCreated(questions);
              }}
            />
          ) : (
            <>
          {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

          <Row>
            <Col md={5}>
              <Form.Group className="mb-3" controlId="modalQuestionType">
                <Form.Label className="fw-bold">Question Type</Form.Label>
                <Form.Select
                  value={questionType}
                  onChange={(e) => changeQuestionType(e.target.value as QuestionType)}
                >
                  <option value="MultipleChoice">Single Choice</option>
                  <option value="MultiSelect">Multiple Choice</option>
                  <option value="TrueFalse">True/False</option>
                  <option value="CodeProgram">Code / Programming</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3" controlId="modalQuestionDifficulty">
                <Form.Label className="fw-bold">Difficulty</Form.Label>
                <Form.Select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end mb-3">
              <Form.Check
                type="checkbox"
                id="modalShuffleOptions"
                label={<span className="fw-bold">Shuffle Options</span>}
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
              />
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="modalQuestionText">
            <Form.Label className="fw-bold">Question</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter your question here"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              isInvalid={!!errors.questionText}
            />
            <Form.Control.Feedback type="invalid">{errors.questionText}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4" controlId="modalQuestionMarks" style={{ maxWidth: 160 }}>
            <Form.Label className="fw-bold">Marks</Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              isInvalid={!!errors.marks}
            />
            <Form.Control.Feedback type="invalid">{errors.marks}</Form.Control.Feedback>
          </Form.Group>

          {questionType === 'CodeProgram' ? (
            <>
              <Form.Group className="mb-3" controlId="modalStarterCode">
                <Form.Label className="fw-bold">Starter Code (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  className="font-monospace"
                  placeholder="Boilerplate shown to the student when they open this question"
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="modalProgrammingLanguage">
                    <Form.Label className="fw-bold">Programming Language</Form.Label>
                    <Form.Select
                      value={programmingLanguage}
                      onChange={(e) => setProgrammingLanguage(e.target.value as ProgrammingLanguage)}
                      isInvalid={!!errors.programmingLanguage}
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
                    <Form.Control.Feedback type="invalid">{errors.programmingLanguage}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end mb-3">
                  <Form.Check
                    type="checkbox"
                    id="modalAllowLanguageChange"
                    label="Allow student to select language"
                    checked={allowLanguageChange}
                    onChange={(e) => setAllowLanguageChange(e.target.checked)}
                  />
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="modalSampleAnswer">
                <Form.Label className="fw-bold">
                  {isSql ? 'Reference Query (required for Sql test cases)' : 'Sample Answer (optional)'}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  className="font-monospace"
                  placeholder={
                    isSql
                      ? 'e.g. SELECT name, score FROM students WHERE score > 85;'
                      : 'Reference solution for grading - students never see this'
                  }
                  value={sampleAnswer}
                  onChange={(e) => setSampleAnswer(e.target.value)}
                />
                <Form.Text className="text-muted">
                  {isSql
                    ? 'Used to automatically compute the expected result for each Sql test case below - never shown to students.'
                    : 'Reference solution for the grading admin only - students never see this.'}
                </Form.Text>
              </Form.Group>

              <hr />
              {isSql ? (
                <SqlTestCaseEditor value={sqlTestCases} onChange={setSqlTestCases} />
              ) : (
                <FunctionSignatureEditor value={signature} onChange={setSignature} />
              )}
            </>
          ) : (
            <>
              <Form.Label className="fw-bold">Options</Form.Label>
              {errors.options && <div className="text-danger small mb-2">{errors.options}</div>}
              {options.map((option, index) => (
                <div key={option.key} className="d-flex align-items-center gap-2 mb-2">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light border fw-bold flex-shrink-0"
                    style={{ width: 32, height: 32 }}
                  >
                    {optionLetter(index)}
                  </span>
                  <Form.Control
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option.optionText}
                    disabled={questionType === 'TrueFalse'}
                    onChange={(e) => updateOptionText(option.key, e.target.value)}
                  />
                  {(questionType === 'MultipleChoice' || questionType === 'MultiSelect') && options.length > 2 && (
                    <Button variant="link" className="text-danger" onClick={() => removeOption(option.key)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {(questionType === 'MultipleChoice' || questionType === 'MultiSelect') && (
                <Button variant="outline-secondary" size="sm" className="mb-3" onClick={addOption}>
                  + Add Option
                </Button>
              )}

              {questionType === 'MultiSelect' ? (
                <Form.Group controlId="modalCorrectAnswers">
                  <Form.Label className="fw-bold">Correct Answers (select all that apply)</Form.Label>
                  {errors.options && <div className="text-danger small mb-2">{errors.options}</div>}
                  {options.map((option, index) => (
                    <Form.Check
                      key={option.key}
                      type="checkbox"
                      id={`modalCorrect-${option.key}`}
                      label={`${optionLetter(index)} - ${option.optionText || `Option ${index + 1}`}`}
                      checked={option.isCorrect}
                      onChange={() => toggleCorrect(option.key)}
                      className="mb-1"
                    />
                  ))}
                </Form.Group>
              ) : (
                <Form.Group controlId="modalCorrectAnswer" style={{ maxWidth: 320 }}>
                  <Form.Label className="fw-bold">Correct Answer</Form.Label>
                  <Form.Select
                    value={options.find((o) => o.isCorrect)?.key ?? ''}
                    onChange={(e) => markCorrect(Number(e.target.value))}
                    isInvalid={!!errors.options}
                  >
                    <option value="" disabled>
                      Select correct answer
                    </option>
                    {options.map((option, index) => (
                      <option key={option.key} value={option.key}>
                        {optionLetter(index)} - {option.optionText || `Option ${index + 1}`}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
            </>
          )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={handleClose}>
            {mode === 'import' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'manual' && (
            <Button type="submit" variant="primary" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Question'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
