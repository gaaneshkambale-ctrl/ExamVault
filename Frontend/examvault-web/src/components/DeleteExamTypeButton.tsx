import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExamType } from '../api/examApi';
import { TrashIcon } from './icons/ActionIcons';

interface DeleteExamTypeButtonProps {
  examTypeId: string;
  onDeleted?: () => void;
}

export default function DeleteExamTypeButton({ examTypeId, onDeleted }: DeleteExamTypeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteExamType(examTypeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
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
        aria-label="Delete exam type"
        onClick={() => setShowConfirm(true)}
      >
        <TrashIcon />
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Exam Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this exam type? Any exams currently using it will show no
          exam type instead. This cannot be undone.
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
