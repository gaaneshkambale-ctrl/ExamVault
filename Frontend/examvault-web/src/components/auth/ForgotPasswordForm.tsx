import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/userApi';
import { extractServerError } from '../../utils/apiError';
import { extractTenantSlug } from '../../utils/tenant';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setErrorMessage('Email is required.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      await forgotPassword({ email, tenantSlug: extractTenantSlug(window.location.hostname) });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(extractServerError(error));
    }
  };

  if (status === 'success') {
    return (
      <>
        <h4 className="fw-bold mb-1">Check Your Email</h4>
        <p className="text-muted small mb-4">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. The link
          expires in 30 minutes.
        </p>
        <Link to="/login" className="btn btn-primary w-100">
          Back to Login
        </Link>
      </>
    );
  }

  return (
    <>
      <h4 className="fw-bold mb-1">Forgot Password?</h4>
      <p className="text-muted small mb-4">Enter your email and we'll send you a link to reset your password.</p>

      {status === 'error' && <Alert variant="danger">{errorMessage}</Alert>}

      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="forgotPasswordEmail">
          <Form.Label className="fw-medium">Email</Form.Label>
          <InputGroup>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </InputGroup>
        </Form.Group>

        <Button
          type="submit"
          variant="primary"
          className="w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </Form>

      <div className="text-center">
        <Link to="/login">&larr; Back to Login</Link>
      </div>
    </>
  );
}
