import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteQuestion } from '../api/questionApi';

interface DeleteQuestionButtonProps {
  questionId: string;
  examId: string;
  onDeleted?: () => void;
}

export default function DeleteQuestionButton({
  questionId,
  examId,
  onDeleted,
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
      <Button
        variant="link"
        size="sm"
        className="text-danger p-0"
        onClick={() => setShowConfirm(true)}
      >
        Delete
      </Button>

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
