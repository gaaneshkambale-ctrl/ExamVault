import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteGroup } from '../api/groupApi';
import { TrashIcon } from './icons/ActionIcons';

interface DeleteGroupButtonProps {
  groupId: string;
  onDeleted?: () => void;
}

export default function DeleteGroupButton({ groupId, onDeleted }: DeleteGroupButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
        aria-label="Delete group"
        onClick={() => setShowConfirm(true)}
      >
        <TrashIcon />
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this group? This cannot be undone.
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
