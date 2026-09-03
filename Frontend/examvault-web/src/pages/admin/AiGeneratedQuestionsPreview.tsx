import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import DraftEditorModal from '../../components/DraftEditorModal';
import { EditIcon, TrashIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { generateQuestions } from '../../api/aiApi';
import { createQuestion } from '../../api/questionApi';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import type { DraftQuestion, GenerateDifficulty, GenerateQuestionsRequest, GenerateQuestionType } from '../../types/ai';
import { extractServerError } from '../../utils/apiError';

const questionTypeLabel: Record<GenerateQuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
};

const difficultyVariant: Record<GenerateDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

interface PreviewState {
  drafts: DraftQuestion[];
  examId: string;
  request: GenerateQuestionsRequest;
  backTo: string;
  returnTo?: string;
}


export default function AiGeneratedQuestionsPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialState = location.state as PreviewState | undefined;
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreateQuestions = user?.role !== 'Instructor' || hasPermission('Questions - Create');

  const [drafts, setDrafts] = useState<DraftQuestion[]>(initialState?.drafts ?? []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set((initialState?.drafts ?? []).map((d) => d.id)),
  );
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  if (!initialState) {
    return (
      <AdminLayout active="Exams">
        <div className="mb-4">
          <h1 className="h4 fw-bold mb-0 text-primary">AI Generated Questions Preview</h1>
        </div>
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            Nothing to preview yet.{' '}
            <Link to="/admin/questions/ai-generate">Generate some questions first</Link>.
          </Card.Body>
        </Card>
      </AdminLayout>
    );
  }

  const { examId, request, backTo, returnTo } = initialState;

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

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    try {
      const result = await generateQuestions(request);
      setDrafts(result);
      setSelectedIds(new Set(result.map((d) => d.id)));
    } catch (error) {
      setGenerateError(extractServerError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    const selectedDrafts = drafts.filter((d) => selectedIds.has(d.id));
    if (selectedDrafts.length === 0) {
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
    navigate(returnTo ?? `/admin/exams/${examId}`);
  };

  const counts = {
    total: drafts.length,
    mcq: drafts.filter((d) => d.questionType === 'MultipleChoice').length,
    multiSelect: drafts.filter((d) => d.questionType === 'MultiSelect').length,
    trueFalse: drafts.filter((d) => d.questionType === 'TrueFalse').length,
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">AI Generated Questions Preview</h1>
      </div>

      {generateError && <Alert variant="danger">{generateError}</Alert>}
      {approveError && <Alert variant="danger">{approveError}</Alert>}

      <Row className="g-3 mb-4">
        <Col xs={6} sm={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Total Questions</div>
              <div className="h4 fw-bold mb-0">{counts.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Single Choice</div>
              <div className="h4 fw-bold mb-0">{counts.mcq}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Multiple Choice</div>
              <div className="h4 fw-bold mb-0">{counts.multiSelect}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} sm={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">True / False</div>
              <div className="h4 fw-bold mb-0">{counts.trueFalse}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={drafts.length === 0 ? '' : 'p-0'}>
          {drafts.length === 0 && (
            <div className="text-center text-muted py-4">
              No questions were generated. Try adjusting your inputs and Regenerate.
            </div>
          )}
          {drafts.length > 0 && (
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
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="View"
                          aria-label="View question"
                          disabled
                        >
                          <ViewIcon />
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Edit"
                          aria-label="Edit question"
                          onClick={() => setEditingDraftId(draft.id)}
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Delete"
                          aria-label="Delete question"
                          onClick={() => handleDeleteDraft(draft.id)}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between mt-3">
        <Link to={backTo} className="btn btn-outline-secondary">
          Back
        </Link>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => void handleRegenerate()} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </Button>
          {canCreateQuestions && (
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
          )}
        </div>
      </div>

      <DraftEditorModal
        draft={editingDraft}
        onCancel={() => setEditingDraftId(null)}
        onSave={handleSaveDraft}
      />
    </AdminLayout>
  );
}
