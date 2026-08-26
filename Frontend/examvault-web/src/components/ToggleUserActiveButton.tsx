import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { activateUser, deactivateUser } from '../api/userApi';

interface ToggleUserActiveButtonProps {
  userId: string;
  isActive: boolean;
}

export default function ToggleUserActiveButton({ userId, isActive }: ToggleUserActiveButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => (isActive ? deactivateUser(userId) : activateUser(userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowConfirm(false);
    },
  });

  const errorMessage = isAxiosError(toggleMutation.error)
    ? (toggleMutation.error.response?.data as { message?: string } | undefined)?.message
    : undefined;

  return (
    <>
      <Button
        variant={isActive ? 'outline-danger' : 'outline-success'}
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        {isActive ? 'Deactivate' : 'Reactivate'}
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isActive ? 'Deactivate User' : 'Reactivate User'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
          {isActive
            ? 'Are you sure you want to deactivate this user? They will be signed out immediately and will not be able to log in until reactivated.'
            : 'Are you sure you want to reactivate this user? They will be able to log in again.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant={isActive ? 'danger' : 'success'}
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            {toggleMutation.isPending ? 'Saving...' : isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
