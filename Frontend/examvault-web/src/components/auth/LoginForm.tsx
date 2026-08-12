import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
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
      const profile = await login(email, password);
      navigate(profile.role === 'Admin' ? '/admin/dashboard' : '/profile');
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
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-4" controlId="loginPassword">
          <div className="d-flex justify-content-between">
            <Form.Label>Password</Form.Label>
            <span className="small">Forgot Password?</span>
          </div>
          <Form.Control
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>

        <Button type="submit" variant="primary" className="w-100" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Logging in...
            </>
          ) : (
            'Login'
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
