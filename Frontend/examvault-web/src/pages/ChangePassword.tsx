import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import BrandMark from '../components/BrandMark';
import { changeMyPassword } from '../api/userApi';
import { useAuth } from '../hooks/useAuth';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 400) {
      return (error.response.data as { message?: string })?.message ?? 'Current password is incorrect.';
    }
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearMustChangePassword } = useAuth();
  const forced = Boolean((location.state as { forced?: boolean } | null)?.forced);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      setFieldError('Current password is required.');
      return;
    }
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
      await changeMyPassword({ currentPassword, newPassword });
      clearMustChangePassword();
      if (forced) {
        navigate(user?.role === 'Admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
      } else {
        setStatus('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <Card className="border-0 shadow-sm" style={{ width: '100%', maxWidth: 440 }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 fw-bold mb-4">
            <BrandMark />
            ExamVault
          </div>

          <h1 className="h5 fw-bold mb-1">{forced ? 'Set a New Password' : 'Change Password'}</h1>
          <p className="text-muted small mb-4">
            {forced
              ? "You're signing in with a temporary password. Set a new password of your own to continue."
              : 'Update the password you use to sign in.'}
          </p>

          {status === 'success' && <Alert variant="success">Your password has been updated.</Alert>}
          {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
          {fieldError && <Alert variant="danger">{fieldError}</Alert>}

          <Form noValidate onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="changePasswordCurrent">
              <Form.Label className="fw-bold">
                {forced ? 'Temporary Password' : 'Current Password'}
              </Form.Label>
              <Form.Control
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="changePasswordNew">
              <Form.Label className="fw-bold">New Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="changePasswordConfirm">
              <Form.Label className="fw-bold">Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
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

            <Button type="submit" variant="primary" className="w-100" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
