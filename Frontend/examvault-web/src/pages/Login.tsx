import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import LoginIllustration from '../components/illustrations/LoginIllustration';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    // Visual only for now - real authentication lands in Phase 3 (JWT + Refresh Token).
    e.preventDefault();
  };

  return (
    <AuthLayout
      title="Welcome Back!"
      subtitle="Login to your account"
      illustration={<LoginIllustration />}
      footer={
        <span className="text-muted">
          Don't have an account? <Link to="/register">Register</Link>
        </span>
      }
    >
      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="loginEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter your email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>

        <Button type="submit" variant="primary" className="w-100">
          Login
        </Button>
      </Form>
    </AuthLayout>
  );
}
