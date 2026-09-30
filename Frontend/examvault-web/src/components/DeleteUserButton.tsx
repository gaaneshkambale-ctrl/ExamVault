import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { deleteUser } from '../api/userApi';
import { TrashIcon } from './icons/ActionIcons';
import { useAuth } from '../hooks/useAuth';

interface DeleteUserButtonProps {
  userId: string;
  onDeleted?: () => void;
  // Compact icon-only rendering for dense table rows (e.g. ManageUsers'
  // action column) - other callers (UserDetails' page-level action bar)
  // keep the labeled button since space isn't at a premium there.
  iconOnly?: boolean;
  userName?: string;
}

export default function DeleteUserButton({ userId, onDeleted, iconOnly = false, userName }: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === userId;

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

  // Same self-lockout protection the backend already enforces ("You cannot
  // delete your own account.") - disabled here too instead of letting the
  // click fail with a modal error.
  if (isSelf) {
    const title = 'You cannot delete your own account.';
    return iconOnly ? (
      <Button
        variant="outline-danger"
        size="sm"
        className="d-inline-flex align-items-center justify-content-center"
        style={{ width: 32, height: 32 }}
        disabled
        title={title}
        aria-label={title}
      >
        <TrashIcon />
      </Button>
    ) : (
      <Button variant="outline-danger" size="sm" disabled title={title}>
        Delete
      </Button>
    );
  }

  return (
    <>
      {iconOnly ? (
        <Button
          variant="outline-danger"
          size="sm"
          className="d-inline-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32 }}
          title="Delete"
          aria-label={userName ? `Delete ${userName}` : 'Delete'}
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
