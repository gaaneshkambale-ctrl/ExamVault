import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { extractServerError } from '../../utils/apiError';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setStatus('error');
      setErrorMessage('Email and password are required.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      const profile = await login(email, password, rememberMe);
      if (profile.mustChangePassword) {
        navigate('/change-password', { state: { forced: true } });
      } else {
        navigate(profile.role === 'Admin' ? '/admin/dashboard' : '/dashboard');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(extractServerError(error));
    }
  };

  return (
    <>
      {status === 'error' && <Alert variant="danger">{errorMessage}</Alert>}
      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="loginEmail">
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

        <Form.Group className="mb-3" controlId="loginPassword">
          <div className="d-flex justify-content-between">
            <Form.Label className="fw-medium">Password</Form.Label>
            <span className="small text-primary" style={{ cursor: 'default' }}>
              Forgot Password?
            </span>
          </div>
          <InputGroup>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <InputGroup.Text
              className="bg-white"
              role="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </InputGroup.Text>
          </InputGroup>
        </Form.Group>

        <Form.Check
          className="mb-4"
          type="checkbox"
          id="loginRememberMe"
          label="Remember me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" />
              Logging in...
            </>
          ) : (
            <>
              Login
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </Button>
      </Form>

      <div className="d-flex align-items-center gap-3 my-4">
        <hr className="flex-grow-1 m-0" />
        <span className="text-muted small">or</span>
        <hr className="flex-grow-1 m-0" />
      </div>

      <Button
        variant="outline-secondary"
        className="w-100 d-flex align-items-center justify-content-center gap-2"
        disabled
        title="Google sign-in isn't connected yet"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 01-2.4 3.64v3h3.88c2.27-2.09 3.57-5.17 3.57-8.83z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0012 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29a7.2 7.2 0 010-4.58V6.6H1.27a12 12 0 000 10.8l4-3.11z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        Continue with Google
      </Button>

      <div className="mt-4 text-center">
        <span className="text-muted">
          Don't have an account? <Link to="/register">Register</Link>
        </span>
      </div>
    </>
  );
}
