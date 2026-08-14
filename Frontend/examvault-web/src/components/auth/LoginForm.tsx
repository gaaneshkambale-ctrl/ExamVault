import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';

function extractServerError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 401) {
    return 'Invalid email or password.';
  }
  return 'Something went wrong. Please try again.';
}

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
      navigate(profile.role === 'Admin' ? '/admin/dashboard' : '/dashboard');
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
      <div className="mt-4 text-center">
        <span className="text-muted">
          Don't have an account? <Link to="/register">Register</Link>
        </span>
      </div>
    </>
  );
}
