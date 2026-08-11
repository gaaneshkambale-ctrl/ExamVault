import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import AuthLayout from '../layouts/AuthLayout';
import RegisterIllustration from '../components/illustrations/RegisterIllustration';
import { registerUser } from '../api/userApi';
import type { RegisterRequest } from '../types/user';

interface FormState extends RegisterRequest {
  confirmPassword: string;
}

const initialFormState: FormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    errors.password = 'Password needs an uppercase letter, a lowercase letter, and a digit.';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      return 'An account with this email already exists.';
    }
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function Register() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [newUserId, setNewUserId] = useState('');

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      const response = await registerUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setNewUserId(response.id);
      setStatus('success');
      setForm(initialFormState);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  if (status === 'success') {
    return (
      <AuthLayout
        title="Create Account"
        subtitle="Register a new account"
        illustration={<RegisterIllustration />}
      >
        <Alert variant="success">
          Account created successfully. You can now <Link to="/login">log in</Link> or{' '}
          <Link to={`/profile/${newUserId}`}>view your profile</Link>.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register a new account"
      illustration={<RegisterIllustration />}
      footer={
        <span className="text-muted">
          Already have an account? <Link to="/login">Login</Link>
        </span>
      }
    >
      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="registerFullName">
          <Form.Label>Full Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={handleChange('fullName')}
            isInvalid={!!fieldErrors.fullName}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange('email')}
            isInvalid={!!fieldErrors.email}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={handleChange('password')}
            isInvalid={!!fieldErrors.password}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.password}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-4" controlId="registerConfirmPassword">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            isInvalid={!!fieldErrors.confirmPassword}
          />
          <Form.Control.Feedback type="invalid">
            {fieldErrors.confirmPassword}
          </Form.Control.Feedback>
        </Form.Group>

        <Button type="submit" variant="primary" className="w-100" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Registering...
            </>
          ) : (
            'Register'
          )}
        </Button>
      </Form>
    </AuthLayout>
  );
}
