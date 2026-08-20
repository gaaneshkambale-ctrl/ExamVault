import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSection } from '../api/sectionApi';

interface DeleteSectionButtonProps {
  examId: string;
  sectionId: string;
  onDeleted?: () => void;
}

export default function DeleteSectionButton({ examId, sectionId, onDeleted }: DeleteSectionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteSection(examId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', examId] });
      setShowConfirm(false);
      onDeleted?.();
    },
  });

  return (
    <>
      <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this section? Its questions will not be deleted - they
          become unassigned and can be added to another section.
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
