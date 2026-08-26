import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteQuestion } from '../api/questionApi';
import { TrashIcon } from './icons/ActionIcons';

interface DeleteQuestionButtonProps {
  questionId: string;
  examId: string;
  onDeleted?: () => void;
  // Compact icon-only rendering for dense table rows (SectionForm's and
  // SectionDetails' question lists) - QuestionDetails' page-level action
  // bar keeps the labeled button since space isn't at a premium there.
  iconOnly?: boolean;
}

export default function DeleteQuestionButton({
  questionId,
  examId,
  onDeleted,
  iconOnly = false,
}: DeleteQuestionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', examId] });
      setShowConfirm(false);
      onDeleted?.();
    },
  });

  return (
    <>
      {iconOnly ? (
        <Button
          variant="outline-danger"
          size="sm"
          className="d-inline-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32 }}
          title="Delete"
          aria-label="Delete question"
          onClick={() => setShowConfirm(true)}
        >
          <TrashIcon />
        </Button>
      ) : (
        <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)}>
          Delete
        </Button>
      )}

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this question? This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
