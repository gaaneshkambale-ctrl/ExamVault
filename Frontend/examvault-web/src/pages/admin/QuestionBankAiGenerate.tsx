import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import { generateQuestions } from '../../api/aiApi';
import { useBankSubjects, useBankTopics } from '../../hooks/useQuestionBank';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { extractServerError } from '../../utils/apiError';
import type { GenerateDifficulty, GenerateQuestionType, GenerateQuestionsRequest } from '../../types/ai';

const TYPE_OPTIONS: { value: GenerateQuestionType; label: string }[] = [
  { value: 'MultipleChoice', label: 'Single Choice' },
  { value: 'MultiSelect', label: 'Multiple Choice' },
  { value: 'TrueFalse', label: 'True/False' },
];
const DIFFICULTY_OPTIONS: GenerateDifficulty[] = ['Easy', 'Medium', 'Hard'];

// AI-generate straight into the Question Bank: no exam involved. The generated
// drafts are reviewed on the shared preview page and, when approved, saved to
// the chosen subject/topic as Drafts (so a person still activates them before
// they can be added to an exam).
export default function QuestionBankAiGenerate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = user?.role !== 'Instructor' || hasPermission('Questions - Create');

  const { data: subjects = [] } = useBankSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const { data: topics = [] } = useBankTopics(subjectId || undefined);

  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [types, setTypes] = useState<GenerateQuestionType[]>(['MultipleChoice']);
  const [levels, setLevels] = useState<GenerateDifficulty[]>(['Medium']);
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const topicName = topics.find((t) => t.id === topicId)?.name ?? '';
  // What the AI is told to write about: the typed description, or - if left
  // blank - the subject (and topic) itself.
  const effectiveTopic = description.trim() || [subjectName, topicName].filter(Boolean).join(': ');

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subjectId) return setError('Choose the subject these questions belong to.');
    if (!effectiveTopic) return setError('Describe what the questions should cover.');
    if (types.length === 0) return setError('Choose at least one question type.');
    if (levels.length === 0) return setError('Choose at least one difficulty level.');
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      return setError('Number of questions must be between 1 and 50.');
    }

    const request: GenerateQuestionsRequest = {
      source: 'TopicText',
      examId: null,
      topic: effectiveTopic,
      questionCount,
      questionTypes: types,
      difficultyLevels: levels,
      additionalInstructions: instructions.trim() || null,
    };

    setGenerating(true);
    setError('');
    try {
      const drafts = await generateQuestions(request);
      navigate('/admin/questions/ai-generate/preview', {
        state: {
          drafts,
          examId: '',
          request,
          backTo: '/admin/question-bank/ai-generate',
          returnTo: '/admin/question-bank',
          bank: { subjectId, topicId: topicId || null, status: 'Draft' },
        },
      });
    } catch (e) {
      setError(extractServerError(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <RoleAwareLayout active="Question Bank">
      <div className="mb-4">
        <p className="text-muted small mb-1">Question Bank / AI Generate</p>
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generate into the Question Bank</h1>
        <p className="text-muted mb-0">Generated questions are saved as Drafts for you to review before they can be used in an exam.</p>
      </div>

      {!canCreate && <Alert variant="warning">You don&apos;t have permission to create questions.</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form onSubmit={submit} noValidate>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="qb-ai-subject">
                  <Form.Label className="fw-bold">Subject *</Form.Label>
                  <Form.Select
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setTopicId('');
                    }}
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Form.Select>
                  {subjects.length === 0 && <Form.Text className="text-muted">Create a subject first (Subjects &amp; Topics).</Form.Text>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="qb-ai-topic">
                  <Form.Label className="fw-bold">Topic</Form.Label>
                  <Form.Select value={topicId} disabled={!subjectId} onChange={(e) => setTopicId(e.target.value)}>
                    <option value="">No topic</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="qb-ai-description">
                  <Form.Label className="fw-bold">What should the questions cover?</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    maxLength={1000}
                    placeholder={effectiveTopic || 'e.g. Database normalization: 1NF to BCNF, with functional dependencies'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Form.Text className="text-muted">Leave blank to use the subject{topicName ? ' and topic' : ''} name.</Form.Text>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="qb-ai-count">
                  <Form.Label className="fw-bold">Number of questions</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Label className="fw-bold d-block">Question types</Form.Label>
                {TYPE_OPTIONS.map((t) => (
                  <Form.Check
                    key={t.value}
                    id={`qb-ai-type-${t.value}`}
                    type="checkbox"
                    label={t.label}
                    checked={types.includes(t.value)}
                    onChange={() => toggle(types, t.value, setTypes)}
                  />
                ))}
              </Col>
              <Col md={4}>
                <Form.Label className="fw-bold d-block">Difficulty</Form.Label>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <Form.Check
                    key={d}
                    id={`qb-ai-level-${d}`}
                    type="checkbox"
                    label={d}
                    checked={levels.includes(d)}
                    onChange={() => toggle(levels, d, setLevels)}
                  />
                ))}
              </Col>

              <Col xs={12}>
                <Form.Group controlId="qb-ai-instructions">
                  <Form.Label className="fw-bold">Additional instructions (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. Use real-world examples; avoid negative phrasing"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Link to="/admin/question-bank" className="btn btn-outline-secondary">
                Back to Question Bank
              </Link>
              <Button type="submit" variant="primary" disabled={generating || !canCreate}>
                {generating ? (
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
    </RoleAwareLayout>
  );
}
