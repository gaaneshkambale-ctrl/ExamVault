import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { confirmEmail, resendConfirmationEmail } from '../api/userApi';
import { extractServerError } from '../utils/apiError';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    token ? 'loading' : 'idle',
  );
  const [confirmMessage, setConfirmMessage] = useState('');

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await confirmEmail({ token });
        if (!cancelled) {
          setConfirmStatus('success');
        }
      } catch (error) {
        if (!cancelled) {
          setConfirmStatus('error');
          setConfirmMessage(extractServerError(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setResendStatus('error');
      setResendError('Email is required.');
      return;
    }

    setResendStatus('loading');
    setResendError('');
    try {
      await resendConfirmationEmail({ email: resendEmail });
      setResendStatus('success');
    } catch (error) {
      setResendStatus('error');
      setResendError(extractServerError(error));
    }
  };

  const resendForm = (
    <>
      {resendStatus === 'success' ? (
        <Alert variant="success" className="mb-0">
          If an unconfirmed account exists for <strong>{resendEmail}</strong>, we've sent a new confirmation link.
        </Alert>
      ) : (
        <Form noValidate onSubmit={handleResend}>
          {resendStatus === 'error' && <Alert variant="danger">{resendError}</Alert>}
          <Form.Group className="mb-3" controlId="resendConfirmationEmail">
            <Form.Label className="fw-medium">Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" variant="primary" className="w-100" disabled={resendStatus === 'loading'}>
            {resendStatus === 'loading' ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              'Resend Confirmation Email'
            )}
          </Button>
        </Form>
      )}
    </>
  );

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
              <h1 className="h5 fw-bold mb-1">Resend Confirmation Email</h1>
              <p className="text-muted small mb-4">
                Enter the email you registered with and we'll send you a new confirmation link.
              </p>
              {resendForm}
              <div className="text-center mt-3">
                <Link to="/login">&larr; Back to Login</Link>
              </div>
            </>
          )}

          {token && confirmStatus === 'loading' && (
            <div className="text-center py-3">
              <Spinner animation="border" className="mb-3" />
              <p className="text-muted small mb-0">Confirming your email...</p>
            </div>
          )}

          {token && confirmStatus === 'success' && (
            <>
              <h1 className="h5 fw-bold mb-1">Email Confirmed</h1>
              <p className="text-muted small mb-4">Your account is ready. You can now log in.</p>
              <Link to="/login" className="btn btn-primary w-100">
                Go to Login
              </Link>
            </>
          )}

          {token && confirmStatus === 'error' && (
            <>
              <h1 className="h5 fw-bold mb-1">Link Invalid or Expired</h1>
              <p className="text-muted small mb-4">{confirmMessage}</p>
              {resendForm}
              <div className="text-center mt-3">
                <Link to="/login">&larr; Back to Login</Link>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
