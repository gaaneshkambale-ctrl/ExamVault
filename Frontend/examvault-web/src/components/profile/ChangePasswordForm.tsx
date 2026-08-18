import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { changeMyPassword } from '../../api/userApi';
import { extractServerError } from '../../utils/apiError';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

export default function ChangePasswordForm() {
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
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <div style={{ maxWidth: 440 }}>
      <h2 className="h5 fw-bold mb-1">Change Password</h2>
      <p className="text-muted mb-4">Update the password you use to sign in.</p>

      {status === 'success' && <Alert variant="success">Your password has been updated.</Alert>}
      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
      {fieldError && <Alert variant="danger">{fieldError}</Alert>}

      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="profileChangePasswordCurrent">
          <Form.Label className="fw-bold">Current Password</Form.Label>
          <Form.Control
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="profileChangePasswordNew">
          <Form.Label className="fw-bold">New Password</Form.Label>
          <Form.Control
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="profileChangePasswordConfirm">
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

        <Button type="submit" variant="primary" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
      </Form>
    </div>
  );
}
