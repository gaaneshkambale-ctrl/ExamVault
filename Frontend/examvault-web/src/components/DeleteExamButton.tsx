import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExam } from '../api/examApi';
import { TrashIcon } from './icons/ActionIcons';

interface DeleteExamButtonProps {
  examId: string;
  onDeleted?: () => void;
}

export default function DeleteExamButton({ examId, onDeleted }: DeleteExamButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setShowConfirm(false);
      onDeleted?.();
    },
  });

  return (
    <>
      <Button
        variant="outline-danger"
        size="sm"
        className="d-inline-flex align-items-center justify-content-center"
        style={{ width: 32, height: 32 }}
        title="Delete"
        aria-label="Delete exam"
        onClick={() => setShowConfirm(true)}
      >
        <TrashIcon />
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Exam</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this exam? This cannot be undone.
        </Modal.Body>
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
