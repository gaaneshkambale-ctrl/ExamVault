import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import DraftEditorModal from '../../components/DraftEditorModal';
import { useExam } from '../../hooks/useExams';
import { generateQuestions } from '../../api/aiApi';
import { createQuestion } from '../../api/questionApi';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

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
    setApproveError('');
    try {
      const result = await generateQuestions(buildRequest());
      setDrafts(result);
      setSelectedIds(new Set(result.map((d) => d.id)));
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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveDraft = (updated: DraftQuestion) => {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setEditingDraftId(null);
  };

  const editingDraft = drafts.find((d) => d.id === editingDraftId) ?? null;

  const handleApprove = async () => {
    const selectedDrafts = drafts.filter((d) => selectedIds.has(d.id));
    if (selectedDrafts.length === 0 || !examId) {
      return;
    }

    setIsApproving(true);
    setApproveError('');

    const results = await Promise.allSettled(
      selectedDrafts.map((draft) =>
        createQuestion({
          examId,
          questionType: draft.questionType,
          questionText: draft.questionText,
          marks: draft.marks,
          difficulty: draft.difficulty,
          shuffleOptions: false,
          options: draft.options,
        }),
      ),
    );

    const failedIds = new Set(
      results
        .map((result, index) => (result.status === 'rejected' ? selectedDrafts[index].id : null))
        .filter((id): id is string => id !== null),
    );

    if (failedIds.size > 0) {
      setApproveError(
        `${failedIds.size} question(s) failed to save and are still in the list below - fix and try again.`,
      );
      setDrafts((prev) => prev.filter((d) => failedIds.has(d.id) || !selectedIds.has(d.id)));
      setSelectedIds(failedIds);
      setIsApproving(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', examId] });
    navigate(`/admin/exams/${examId}/edit`);
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
          {approveError && <Alert variant="danger">{approveError}</Alert>}

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
                    <th className="ps-4" style={{ width: 40 }}>
                      <Form.Check
                        type="checkbox"
                        aria-label="Select all"
                        checked={drafts.length > 0 && selectedIds.size === drafts.length}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? new Set(drafts.map((d) => d.id)) : new Set())
                        }
                      />
                    </th>
                    <th>Question</th>
                    <th>Type</th>
                    <th>Difficulty</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr key={draft.id}>
                      <td className="ps-4">
                        <Form.Check
                          type="checkbox"
                          aria-label={`Select question: ${draft.questionText}`}
                          checked={selectedIds.has(draft.id)}
                          onChange={() => toggleSelected(draft.id)}
                        />
                      </td>
                      <td className="fw-medium" style={{ maxWidth: 420 }}>
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
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => setEditingDraftId(draft.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteDraft(draft.id)}
                          >
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
              <Button
                variant="primary"
                onClick={() => void handleApprove()}
                disabled={isApproving || selectedIds.size === 0}
              >
                {isApproving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Adding...
                  </>
                ) : (
                  `Add Selected to Exam (${selectedIds.size})`
                )}
              </Button>
            </div>
          </div>

          <DraftEditorModal
            draft={editingDraft}
            onCancel={() => setEditingDraftId(null)}
            onSave={handleSaveDraft}
          />
        </>
      )}
    </AdminLayout>
  );
}
