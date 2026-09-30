import { useEffect, useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { extractServerError } from '../utils/apiError';

interface BankConfirmDeleteModalProps {
  show: boolean;
  title: string;
  message: string;
  onHide: () => void;
  // Resolve to close; reject (throw) to keep it open and show the server's
  // reason (e.g. "This subject still has topics or questions").
  onConfirm: () => Promise<unknown>;
}

export default function BankConfirmDeleteModal({ show, title, message, onHide, onConfirm }: BankConfirmDeleteModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) setError(null);
  }, [show]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onHide();
    } catch (e) {
      setError(extractServerError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {message}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} disabled={busy}>
          {busy ? 'Deleting...' : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
