import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { updateUser } from '../../api/userApi';
import { useUser } from '../../hooks/useUsers';
import type { UpdateUserRequest, UserRole } from '../../types/user';

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      return 'A user with this email already exists.';
    }
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function EditUser() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError } = useUser(id);

  const [form, setForm] = useState<UpdateUserRequest | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateUserRequest, string>>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName, email: user.email, role: user.role });
    }
  }, [user]);

  const updateField = <K extends keyof UpdateUserRequest>(field: K, value: UpdateUserRequest[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveMutation = useMutation({
    mutationFn: (request: UpdateUserRequest) => updateUser(id!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      navigate('/admin/users');
    },
    onError: (error) => setServerError(extractServerError(error)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) {
      return;
    }

    const errors: Partial<Record<keyof UpdateUserRequest, string>> = {};
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

    setServerError('');
    saveMutation.mutate(form);
  };

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Edit User</h1>
          <p className="text-muted mb-0">Update user information and permissions.</p>
        </div>
        <Link to="/admin/users" className="btn btn-outline-secondary">
          Back to Users
        </Link>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <Alert variant="danger">Couldn't load this user. They may not exist.</Alert>}

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      {user && form && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Form noValidate onSubmit={handleSubmit}>
              <h2 className="h6 fw-bold mb-3">Basic Information</h2>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="editUserFullName">
                    <Form.Label className="fw-bold">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={form.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      isInvalid={!!fieldErrors.fullName}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="editUserEmail">
                    <Form.Label className="fw-bold">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      isInvalid={!!fieldErrors.email}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-4" controlId="editUserRole">
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
              </Row>

              <div className="d-flex justify-content-end gap-2">
                <Link to="/admin/users" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  );
}
