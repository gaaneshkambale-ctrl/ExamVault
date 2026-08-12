import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { deleteUser } from '../api/userApi';

interface DeleteUserButtonProps {
  userId: string;
  onDeleted?: () => void;
}

export default function DeleteUserButton({ userId, onDeleted }: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowConfirm(false);
      onDeleted?.();
    },
  });

  const errorMessage = isAxiosError(deleteMutation.error)
    ? (deleteMutation.error.response?.data as { message?: string } | undefined)?.message
    : undefined;

  return (
    <>
      <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
          Are you sure you want to delete this user? This cannot be undone.
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
