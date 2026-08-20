import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAssignment } from '../api/assignmentApi';
import { TrashIcon } from './icons/ActionIcons';

interface DeleteAssignmentButtonProps {
  assignmentId: string;
}

export default function DeleteAssignmentButton({ assignmentId }: DeleteAssignmentButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowConfirm(false);
    },
  });

  return (
    <>
      <Button
        variant="outline-danger"
        size="sm"
        className="d-inline-flex align-items-center justify-content-center"
        style={{ width: 32, height: 32 }}
        onClick={() => setShowConfirm(true)}
        title="Delete assignment"
        aria-label="Delete assignment"
      >
        <TrashIcon />
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to unassign this exam? Students will lose access immediately.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
