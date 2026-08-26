import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { changeMyPassword } from '../../api/userApi';
import { extractServerError } from '../../utils/apiError';

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label className="fw-bold">{label}</Form.Label>
      <InputGroup>
        <Form.Control
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="outline-secondary"
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={visible} />
        </Button>
      </InputGroup>
    </Form.Group>
  );
}

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
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <h2 className="h6 fw-bold mb-1">Change Password</h2>
        <p className="text-muted small mb-4">Update the password you use to sign in.</p>

        {status === 'success' && <Alert variant="success">Your password has been updated.</Alert>}
        {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
        {fieldError && <Alert variant="danger">{fieldError}</Alert>}

        <Form noValidate onSubmit={handleSubmit}>
          <PasswordField
            id="profileChangePasswordCurrent"
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="profileChangePasswordNew"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="profileChangePasswordConfirm"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

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
              'Update Password'
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
