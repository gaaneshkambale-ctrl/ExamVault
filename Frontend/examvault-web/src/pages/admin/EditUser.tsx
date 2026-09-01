import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ToggleUserActiveButton from '../../components/ToggleUserActiveButton';
import { updateUser } from '../../api/userApi';
import { useUser } from '../../hooks/useUsers';
import type { UpdateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';

const USER_ERROR_OVERRIDES = { 409: 'A user with this email already exists.' };

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
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
      setForm({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber ?? '',
        rollNumber: user.rollNumber ?? '',
      });
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
    onError: (error) => setServerError(extractServerError(error, USER_ERROR_OVERRIDES)),
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
              <SectionHeader icon={<UserIcon />} title="Basic Information" />
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
                <Col md={4}>
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
                <Col md={4}>
                  <Form.Group className="mb-4" controlId="editUserRollNumber">
                    <Form.Label className="fw-bold">Roll No.</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter roll number (optional)"
                      value={form.rollNumber ?? ''}
                      onChange={(e) => updateField('rollNumber', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-4" controlId="editUserPhoneNumber">
                    <Form.Label className="fw-bold">Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      placeholder="Enter phone number (optional)"
                      value={form.phoneNumber}
                      onChange={(e) => updateField('phoneNumber', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <SectionHeader icon={<ShieldIcon />} title="Account Status" />
              <div className="d-flex align-items-center justify-content-between border rounded-3 p-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                  <Badge bg={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-muted small">
                    {user.isActive
                      ? 'This user can currently log in.'
                      : 'This user cannot log in until reactivated.'}
                  </span>
                </div>
                <ToggleUserActiveButton userId={user.id} isActive={user.isActive} />
              </div>

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
