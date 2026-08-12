import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExam } from '../../hooks/useExams';
import { generateQuestions } from '../../api/aiApi';
import type {
  DraftQuestion,
  GenerateDifficulty,
  GenerateQuestionsRequest,
  GenerateQuestionType,
  GenerateSource,
} from '../../types/ai';

const questionTypeLabel: Record<GenerateQuestionType, string> = {
  MultipleChoice: 'Multiple Choice',
  TrueFalse: 'True/False',
};

const difficultyVariant: Record<GenerateDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 502) {
      return 'Failed to generate questions. Please try again.';
    }
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function AiGenerateQuestions() {
  const { examId } = useParams<{ examId: string }>();
  const { data: exam } = useExam(examId);

  const [view, setView] = useState<'form' | 'preview'>('form');
  const [source, setSource] = useState<GenerateSource>('ExistingExam');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<GenerateQuestionType[]>(['MultipleChoice']);
  const [difficultyLevels, setDifficultyLevels] = useState<GenerateDifficulty[]>(['Medium']);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);

  const toggleQuestionType = (type: GenerateQuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleDifficulty = (level: GenerateDifficulty) => {
    setDifficultyLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const buildRequest = (): GenerateQuestionsRequest => ({
    source,
    examId: source === 'ExistingExam' ? (examId ?? null) : null,
    topic:
      source === 'ExistingExam'
        ? (exam ? `${exam.title}${exam.description ? `: ${exam.description}` : ''}` : '')
        : topic,
    questionCount,
    questionTypes,
    difficultyLevels,
    additionalInstructions: additionalInstructions.trim() || null,
  });

  const runGenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    try {
      const result = await generateQuestions(buildRequest());
      setDrafts(result);
      setView('preview');
    } catch (error) {
      setGenerateError(extractServerError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runGenerate();
  };

  const handleRegenerate = () => {
    void runGenerate();
  };

  const counts = {
    total: drafts.length,
    mcq: drafts.filter((d) => d.questionType === 'MultipleChoice').length,
    trueFalse: drafts.filter((d) => d.questionType === 'TrueFalse').length,
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generate Questions</h1>
        <p className="text-muted mb-0">
          {exam ? `Exam: ${exam.title}` : 'Loading exam...'}
        </p>
      </div>

      {view === 'form' && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            {generateError && <Alert variant="danger">{generateError}</Alert>}

            <Form noValidate onSubmit={handleSubmit}>
              <Form.Label className="fw-bold">Choose Source</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant={source === 'ExistingExam' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setSource('ExistingExam')}
                >
                  From Existing Exam
                </Button>
                <Button
                  type="button"
                  variant={source === 'TopicText' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setSource('TopicText')}
                >
                  From Topic / Text
                </Button>
                <Button type="button" variant="outline-secondary" size="sm" disabled>
                  From Document
                </Button>
              </div>

              <Row>
                <Col md={6}>
                  {source === 'ExistingExam' ? (
                    <Form.Group className="mb-3" controlId="aiSourceExam">
                      <Form.Label className="fw-bold">Exam</Form.Label>
                      <Form.Control type="text" value={exam?.title ?? ''} disabled readOnly />
                    </Form.Group>
                  ) : (
                    <Form.Group className="mb-3" controlId="aiSourceTopic">
                      <Form.Label className="fw-bold">Topic / Text</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Object-oriented programming basics"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </Form.Group>
                  )}
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="aiQuestionCount" style={{ maxWidth: 200 }}>
                    <Form.Label className="fw-bold">Number of Questions</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Label className="fw-bold">Question Types</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant={questionTypes.includes('MultipleChoice') ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => toggleQuestionType('MultipleChoice')}
                >
                  Multiple Choice
                </Button>
                <Button
                  type="button"
                  variant={questionTypes.includes('TrueFalse') ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => toggleQuestionType('TrueFalse')}
                >
                  True / False
                </Button>
                <Button type="button" variant="outline-secondary" size="sm" disabled>
                  Short Answer
                </Button>
              </div>

              <Form.Label className="fw-bold">Difficulty Level</Form.Label>
              <div className="d-flex gap-4 mb-4">
                {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                  <Form.Check
                    key={level}
                    type="checkbox"
                    id={`aiDifficulty${level}`}
                    label={level}
                    checked={difficultyLevels.includes(level)}
                    onChange={() => toggleDifficulty(level)}
                  />
                ))}
              </div>

              <Form.Group className="mb-4" controlId="aiInstructions">
                <Form.Label className="fw-bold">Additional Instructions (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter any specific instructions for AI..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Link to={`/admin/exams/${examId}/edit`} className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isGenerating ||
                    questionTypes.length === 0 ||
                    difficultyLevels.length === 0 ||
                    (source === 'TopicText' && !topic.trim())
                  }
                >
                  {isGenerating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate Questions'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {view === 'preview' && (
        <>
          {generateError && <Alert variant="danger">{generateError}</Alert>}

          <Row className="g-3 mb-4">
            <Col xs={12} sm={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Total Questions</div>
                  <div className="h4 fw-bold mb-0">{counts.total}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Multiple Choice</div>
                  <div className="h4 fw-bold mb-0">{counts.mcq}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <div className="text-muted small">True / False</div>
                  <div className="h4 fw-bold mb-0">{counts.trueFalse}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">Question</th>
                    <th>Type</th>
                    <th>Difficulty</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr key={draft.id}>
                      <td className="ps-4 fw-medium" style={{ maxWidth: 420 }}>
                        {draft.questionText}
                      </td>
                      <td>{questionTypeLabel[draft.questionType]}</td>
                      <td>
                        <Badge bg={difficultyVariant[draft.difficulty]}>{draft.difficulty}</Badge>
                      </td>
                      <td className="pe-4">
                        <div className="d-flex gap-2">
                          <Button variant="outline-secondary" size="sm" disabled>
                            View
                          </Button>
                          <Button variant="outline-primary" size="sm" disabled>
                            Edit
                          </Button>
                          <Button variant="outline-danger" size="sm" disabled>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-between mt-3">
            <Button variant="outline-secondary" onClick={() => setView('form')}>
              Back
            </Button>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={handleRegenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Regenerating...
                  </>
                ) : (
                  'Regenerate'
                )}
              </Button>
              <Button variant="primary" disabled>
                Add Selected to Exam
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
