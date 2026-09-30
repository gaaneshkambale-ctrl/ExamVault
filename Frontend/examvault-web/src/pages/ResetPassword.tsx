import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { resetPasswordWithToken } from '../api/userApi';
import { extractServerError } from '../utils/apiError';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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
      await resetPasswordWithToken({ token, newPassword });
      setStatus('success');
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

          {!token && (
            <>
              <h1 className="h5 fw-bold mb-1">Invalid Reset Link</h1>
              <p className="text-muted small mb-4">
                This password reset link is missing its token. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn btn-primary w-100">
                Request a New Link
              </Link>
            </>
          )}

          {token && status === 'success' && (
            <>
              <h1 className="h5 fw-bold mb-1">Password Reset</h1>
              <p className="text-muted small mb-4">
                Your password has been reset. You can now log in with your new password.
              </p>
              <Link to="/login" className="btn btn-primary w-100">
                Go to Login
              </Link>
            </>
          )}

          {token && status !== 'success' && (
            <>
              <h1 className="h5 fw-bold mb-1">Set a New Password</h1>
              <p className="text-muted small mb-4">Choose a new password for your account.</p>

              {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
              {fieldError && <Alert variant="danger">{fieldError}</Alert>}

              <Form noValidate onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="resetPasswordNew">
                  <Form.Label className="fw-bold">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="resetPasswordConfirm">
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
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
