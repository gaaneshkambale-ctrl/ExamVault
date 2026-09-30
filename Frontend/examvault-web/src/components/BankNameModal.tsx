import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { extractServerError } from '../utils/apiError';

interface BankNameModalProps {
  show: boolean;
  title: string;
  // Present only for subjects, which have an optional description.
  withDescription?: boolean;
  initialName?: string;
  initialDescription?: string | null;
  submitLabel?: string;
  onHide: () => void;
  // Resolve to close; reject (throw) to keep the modal open and show the error.
  onSubmit: (name: string, description: string | null) => Promise<unknown>;
}

// Shared "type a name" dialog for the Question Bank taxonomy (subject,
// topic, tag) - they all differ only in title and the optional description.
export default function BankNameModal({
  show,
  title,
  withDescription = false,
  initialName = '',
  initialDescription = null,
  submitLabel = 'Save',
  onHide,
  onSubmit,
}: BankNameModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setName(initialName);
      setDescription(initialDescription ?? '');
      setError(null);
    }
  }, [show, initialName, initialDescription]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name.trim(), withDescription ? description.trim() || null : null);
      onHide();
    } catch (e) {
      setError(extractServerError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3" controlId="bank-name">
            <Form.Label>Name</Form.Label>
            <Form.Control autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>
          {withDescription && (
            <Form.Group controlId="bank-description">
              <Form.Label>Description (optional)</Form.Label>
              <Form.Control as="textarea" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
