import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { updateMyProfile } from '../../api/userApi';
import { useAuth } from '../../hooks/useAuth';
import { extractServerError } from '../../utils/apiError';

export default function PersonalInfoPanel() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => updateMyProfile({ fullName, phoneNumber }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  if (!user) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    updateMutation.mutate();
  };

  return (
    <Form noValidate onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
      {saved && (
        <Alert variant="success" onClose={() => setSaved(false)} dismissible>
          Profile updated.
        </Alert>
      )}
      {updateMutation.isError && <Alert variant="danger">{extractServerError(updateMutation.error)}</Alert>}

      <Form.Group as={Row} className="mb-3 align-items-center">
        <Form.Label column sm={4} className="text-muted">
          Full Name
        </Form.Label>
        <Col sm={8}>
          <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3 align-items-center">
        <Form.Label column sm={4} className="text-muted">
          Email
        </Form.Label>
        <Col sm={8}>
          <Form.Control value={user.email} readOnly />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3 align-items-center">
        <Form.Label column sm={4} className="text-muted">
          Role
        </Form.Label>
        <Col sm={8}>
          <Form.Control value={user.role} readOnly />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-4 align-items-center">
        <Form.Label column sm={4} className="text-muted">
          Phone Number
        </Form.Label>
        <Col sm={8}>
          <Form.Control
            value={phoneNumber ?? ''}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Optional"
          />
        </Col>
      </Form.Group>

      <div className="d-flex justify-content-end">
        <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Update Profile'
          )}
        </Button>
      </div>
    </Form>
  );
}
