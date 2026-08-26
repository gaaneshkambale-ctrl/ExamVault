import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { registerUser } from '../../api/userApi';
import { validate } from '../../utils/validation';
import type { RegisterFormState } from '../../utils/validation';
import { extractServerError } from '../../utils/apiError';

type FormState = RegisterFormState;

const initialFormState: FormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const REGISTER_ERROR_OVERRIDES = { 409: 'An account with this email already exists.' };

function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
  ].filter(Boolean).length;

  if (!password) return { score: 0, label: '', color: '#e2e8f0' };
  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score: 2, label: 'Medium', color: '#f59e0b' };
  return { score: 3, label: 'Strong', color: '#22c55e' };
}

function EyeToggle({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <InputGroup.Text className="bg-white" role="button" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'}>
      {shown ? (
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
  );
}

export default function RegisterForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      await registerUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setStatus('success');
      setForm(initialFormState);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error, REGISTER_ERROR_OVERRIDES));
    }
  };

  if (status === 'success') {
    return (
      <Alert variant="success">
        Account created successfully. You can now <Link to="/login">log in</Link>.
      </Alert>
    );
  }

  const strength = passwordStrength(form.password);

  return (
    <>
      {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
      <Form noValidate onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="registerFullName">
          <Form.Label className="fw-medium">Full Name</Form.Label>
          <InputGroup hasValidation>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0116 0" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange('fullName')}
              isInvalid={!!fieldErrors.fullName}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerEmail">
          <Form.Label className="fw-medium">Email</Form.Label>
          <InputGroup hasValidation>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              value={form.email}
              onChange={handleChange('email')}
              isInvalid={!!fieldErrors.email}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerPassword">
          <Form.Label className="fw-medium">Password</Form.Label>
          <InputGroup hasValidation>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange('password')}
              isInvalid={!!fieldErrors.password}
            />
            <EyeToggle shown={showPassword} onClick={() => setShowPassword((v) => !v)} />
            <Form.Control.Feedback type="invalid">{fieldErrors.password}</Form.Control.Feedback>
          </InputGroup>
          {form.password && (
            <div className="mt-2">
              <div className="d-flex gap-1 mb-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 4,
                      flex: 1,
                      borderRadius: 2,
                      background: i < strength.score ? strength.color : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
              <span className="small text-muted">
                Password strength: <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
              </span>
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-4" controlId="registerConfirmPassword">
          <Form.Label className="fw-medium">Confirm Password</Form.Label>
          <InputGroup hasValidation>
            <InputGroup.Text className="bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              isInvalid={!!fieldErrors.confirmPassword}
            />
            <EyeToggle shown={showConfirmPassword} onClick={() => setShowConfirmPassword((v) => !v)} />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.confirmPassword}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Button
          type="submit"
          variant="primary"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Spinner animation="border" size="sm" />
              Registering...
            </>
          ) : (
            <>
              Register
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
        title="Google sign-up isn't connected yet"
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
        Sign up with Google
      </Button>

      <div className="mt-4 text-center">
        <span className="text-muted">
          Already have an account? <Link to="/login">Login</Link>
        </span>
      </div>
    </>
  );
}
