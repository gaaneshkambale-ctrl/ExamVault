import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { resetUserPassword } from '../../api/userApi';
import { useUser } from '../../hooks/useUsers';
import { extractServerError } from '../../utils/apiError';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

export default function ResetPassword() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useUser(id);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setFieldError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }
    setFieldError('');

    setStatus('loading');
    setServerError('');
    try {
      await resetUserPassword(id!, { newPassword });
      navigate(`/admin/users/${id}`);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Reset Password</h1>
          <p className="text-muted mb-0">Reset password for the user.</p>
        </div>
        <Link to={id ? `/admin/users/${id}` : '/admin/users'} className="btn btn-outline-secondary">
          Back to Users
        </Link>
      </div>

      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
      {fieldError && <Alert variant="danger">{fieldError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Alert variant="info">
            This sets a new password directly for {user ? user.fullName : 'this user'}. They'll need to
            use it on their next sign-in.
          </Alert>

          <Form noValidate onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="resetPasswordEmail">
              <Form.Label className="fw-bold">Email</Form.Label>
              <Form.Control type="email" value={user?.email ?? ''} disabled readOnly />
            </Form.Group>

            <Form.Group className="mb-3" controlId="resetPasswordNew">
              <Form.Label className="fw-bold">New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="resetPasswordConfirm">
              <Form.Label className="fw-bold">Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Group>

            <Card body className="bg-light border-0 mb-4">
              <div className="fw-bold small mb-2">Password must contain:</div>
              <ul className="list-unstyled mb-0 small">
                {requirements.map((req) => {
                  const met = req.test(newPassword);
                  return (
                    <li key={req.label} className={met ? 'text-success' : 'text-muted'}>
                      {met ? '✓' : '○'} {req.label}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <div className="d-flex justify-content-end gap-2">
              <Link to={id ? `/admin/users/${id}` : '/admin/users'} className="btn btn-outline-secondary">
                Cancel
              </Link>
              <Button type="submit" variant="primary" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
