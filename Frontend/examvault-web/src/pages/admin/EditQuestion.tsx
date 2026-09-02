import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import { updateQuestion } from '../../api/questionApi';
import { useQuestion } from '../../hooks/useQuestions';
import { validateCreateQuestion } from '../../utils/createQuestionValidation';
import { extractServerError } from '../../utils/apiError';
import type {
  CreateQuestionOptionRequest,
  ProgrammingLanguage,
  QuestionDifficulty,
  QuestionResponse,
  QuestionType,
  UpdateQuestionRequest,
} from '../../types/question';
import { PROGRAMMING_LANGUAGES } from '../../types/question';
import FunctionSignatureEditor, { EMPTY_SIGNATURE } from '../../components/FunctionSignatureEditor';
import type { FunctionSignatureValue } from '../../components/FunctionSignatureEditor';
import SqlTestCaseEditor from '../../components/SqlTestCaseEditor';
import type { SqlTestCaseRow } from '../../components/SqlTestCaseEditor';
import { formatTypedValue, parseTypedValue } from '../../utils/typedValue';

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

function trueFalseOptions(existing: CreateQuestionOptionRequest[]): OptionFormState[] {
  return [
    {
      key: nextOptionKey++,
      optionText: 'True',
      isCorrect: existing.find((o) => o.optionText === 'True')?.isCorrect ?? false,
    },
    {
      key: nextOptionKey++,
      optionText: 'False',
      isCorrect: existing.find((o) => o.optionText === 'False')?.isCorrect ?? false,
    },
  ];
}

function toOptionFormState(question: QuestionResponse): OptionFormState[] {
  return question.options
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((o) => ({ key: nextOptionKey++, optionText: o.optionText, isCorrect: o.isCorrect }));
}

let nextSignatureRowKey = 0;

function toSignatureFormState(question: QuestionResponse): FunctionSignatureValue {
  const parameters = (question.parameters ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((p) => ({ key: nextSignatureRowKey++, name: p.name, type: p.type }));

  const testCases = (question.testCases ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tc) => ({
      key: nextSignatureRowKey++,
      argumentTexts: tc.arguments.map((arg, i) => formatTypedValue(arg, parameters[i]?.type ?? 'String')),
      expectedOutputText: formatTypedValue(tc.expectedOutput, question.returnType ?? 'String'),
    }));

  return {
    functionName: question.functionName ?? '',
    returnType: question.returnType ?? '',
    parameters,
    testCases,
  };
}

let nextSqlTestCaseRowKey = 0;

function toSqlTestCaseFormState(question: QuestionResponse): SqlTestCaseRow[] {
  return (question.sqlTestCases ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tc) => ({ key: nextSqlTestCaseRowKey++, setupSql: tc.setupSql }));
}


export default function EditQuestion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: question, isLoading, isError } = useQuestion(id);

  const [questionType, setQuestionType] = useState<QuestionType>('MultipleChoice');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('Easy');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [options, setOptions] = useState<OptionFormState[]>([]);
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

  useEffect(() => {
    if (question) {
      setQuestionType(question.questionType);
      setQuestionText(question.questionText);
      setMarks(question.marks);
      setDifficulty(question.difficulty);
      setShuffleOptions(question.shuffleOptions);
      setOptions(toOptionFormState(question));
      setStarterCode(question.starterCode ?? '');
      setProgrammingLanguage(question.programmingLanguage ?? '');
      setAllowLanguageChange(question.allowLanguageChange ?? false);
      setSampleAnswer(question.sampleAnswer ?? '');
      setSignature(toSignatureFormState(question));
      setSqlTestCases(toSqlTestCaseFormState(question));
    }
  }, [question]);

  const changeQuestionType = (type: QuestionType) => {
    setQuestionType(type);
    setOptions(type === 'TrueFalse' ? trueFalseOptions(options) : [newOption(), newOption()]);
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
    if (!id) {
      return;
    }

    const form: UpdateQuestionRequest =
      questionType === 'CodeProgram'
        ? {
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
      await updateQuestion(id, form);
      queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', question!.examId] });
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
      navigate(backLink);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  const backLink = question
    ? question.sectionId
      ? `/admin/exams/${question.examId}/sections/${question.sectionId}/edit?step=3`
      : `/admin/exams/${question.examId}`
    : '/admin/exams';

  return (
    <RoleAwareLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Edit Question</h1>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Couldn't load this question. It may not exist.</Alert>
      )}

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      {question && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Form noValidate onSubmit={handleSubmit}>
              <Row>
                <Col md={5}>
                  <Form.Group className="mb-3" controlId="editQuestionType">
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
                  <Form.Group className="mb-3" controlId="editQuestionDifficulty">
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
                    id="editShuffleOptions"
                    label={<span className="fw-bold">Shuffle Options</span>}
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                  />
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="editQuestionText">
                <Form.Label className="fw-bold">Question</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  isInvalid={!!errors.questionText}
                />
                <Form.Control.Feedback type="invalid">{errors.questionText}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4" controlId="editQuestionMarks" style={{ maxWidth: 160 }}>
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
                  <Form.Group className="mb-3" controlId="editStarterCode">
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
                      <Form.Group className="mb-3" controlId="editProgrammingLanguage">
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
                        <Form.Control.Feedback type="invalid">
                          {errors.programmingLanguage}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6} className="d-flex align-items-end mb-3">
                      <Form.Check
                        type="checkbox"
                        id="editAllowLanguageChange"
                        label="Allow student to select language"
                        checked={allowLanguageChange}
                        onChange={(e) => setAllowLanguageChange(e.target.checked)}
                      />
                    </Col>
                  </Row>

                  <Form.Group className="mb-4" controlId="editSampleAnswer">
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
                      {(questionType === 'MultipleChoice' || questionType === 'MultiSelect') &&
                        options.length > 2 && (
                          <Button
                            variant="link"
                            className="text-danger"
                            onClick={() => removeOption(option.key)}
                          >
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
                    <Form.Group className="mb-4" controlId="editCorrectAnswers">
                      <Form.Label className="fw-bold">Correct Answers (select all that apply)</Form.Label>
                      {errors.options && <div className="text-danger small mb-2">{errors.options}</div>}
                      {options.map((option, index) => (
                        <Form.Check
                          key={option.key}
                          type="checkbox"
                          id={`editCorrect-${option.key}`}
                          label={`${optionLetter(index)} - ${option.optionText || `Option ${index + 1}`}`}
                          checked={option.isCorrect}
                          onChange={() => toggleCorrect(option.key)}
                          className="mb-1"
                        />
                      ))}
                    </Form.Group>
                  ) : (
                    <Form.Group className="mb-4" controlId="editCorrectAnswer" style={{ maxWidth: 320 }}>
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

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Link to={backLink} className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button type="submit" variant="primary" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </RoleAwareLayout>
  );
}
