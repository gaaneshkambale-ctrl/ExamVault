import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { createUser } from '../../api/userApi';
import type { CreateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';

type CreateUserFormState = CreateUserRequest;

const initialFormState: CreateUserFormState = {
  fullName: '',
  email: '',
  role: 'Student',
  isActive: false,
  phoneNumber: '',
};

const USER_ERROR_OVERRIDES = { 409: 'A user with this email already exists.' };

export default function CreateUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateUserFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateUserFormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const updateField = <K extends keyof CreateUserFormState>(field: K, value: CreateUserFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<keyof CreateUserFormState, string>> = {};
    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await createUser(form);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/admin/users');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error, USER_ERROR_OVERRIDES));
    }
  };

  return (
    <AdminLayout active="Users">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Add New User</h1>
        <p className="text-muted mb-0">Create a new user and assign role.</p>
      </div>

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form noValidate onSubmit={handleSubmit}>
            <h2 className="h6 fw-bold mb-3">Basic Information</h2>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="createUserFullName">
                  <Form.Label className="fw-bold">Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter full name"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    isInvalid={!!fieldErrors.fullName}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="createUserEmail">
                  <Form.Label className="fw-bold">Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    isInvalid={!!fieldErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Alert variant="info" className="py-2 small">
              A temporary password will be generated and emailed to this address. The user
              will be asked to set their own password the first time they log in.
            </Alert>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-4" controlId="createUserRole">
                  <Form.Label className="fw-bold">Role</Form.Label>
                  <Form.Select
                    value={form.role}
                    onChange={(e) => updateField('role', e.target.value as UserRole)}
                  >
                    <option value="Student">Student</option>
                    <option value="Admin">Admin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-4" controlId="createUserPhoneNumber">
                  <Form.Label className="fw-bold">Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="Enter phone number (optional)"
                    value={form.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                    isInvalid={!!fieldErrors.phoneNumber}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.phoneNumber}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/admin/users')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save User'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
