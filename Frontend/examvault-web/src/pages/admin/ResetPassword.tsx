import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import UserAvatar from '../../components/UserAvatar';
import { resetUserPassword } from '../../api/userApi';
import { useUser } from '../../hooks/useUsers';
import { extractServerError } from '../../utils/apiError';
import type { UserRole } from '../../types/user';

const roleVariant: Record<UserRole, string> = {
  Admin: 'primary',
  Student: 'secondary',
};

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5L18 5" /><path d="M18 5l3 3" />
    </svg>
  );
}

const requirements: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
];

type Method = 'link' | 'set';

export default function ResetPassword() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useUser(id);

  const [step, setStep] = useState<'select' | 'form'>('select');
  const [method, setMethod] = useState<Method>('set');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

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
      await resetUserPassword(id!, { newPassword });
      navigate(`/admin/users/${id}`);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <p className="text-muted small mb-0">Users / Reset Password</p>
        <Link to={id ? `/admin/users/${id}` : '/admin/users'} className="btn btn-outline-secondary btn-sm">
          &larr; Back to Users
        </Link>
      </div>
      <h1 className="h4 fw-bold mb-1 text-primary">Reset Password</h1>
      <p className="text-muted mb-4">Choose how you want to reset the user's password.</p>

      <Row className="g-4">
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              {user && (
                <>
                  <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} userId={id} size={80} />
                  <div className="fw-bold mt-3">{user.fullName}</div>
                  <div className="text-muted small mb-2">{user.email}</div>
                  <Badge bg={roleVariant[user.role]}>{user.role}</Badge>{' '}
                  <Badge bg={user.isActive ? 'success' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
              {fieldError && <Alert variant="danger">{fieldError}</Alert>}

              {step === 'select' && (
                <>
                  <SectionHeader icon={<KeyIcon />} title="Select Reset Method" />
                  <Form.Check
                    type="radio"
                    id="reset-method-link"
                    name="reset-method"
                    className="mb-1"
                    disabled
                    checked={false}
                    onChange={() => {}}
                    label={<span className="fw-medium">Send Reset Link</span>}
                  />
                  <p className="text-muted small ms-4 mb-3">
                    Not available yet - ExamVault doesn't send password-reset emails today.
                  </p>

                  <Form.Check
                    type="radio"
                    id="reset-method-set"
                    name="reset-method"
                    className="mb-1"
                    checked={method === 'set'}
                    onChange={() => setMethod('set')}
                    label={<span className="fw-medium">Set New Password</span>}
                  />
                  <p className="text-muted small ms-4 mb-4">Set a new password directly for the user.</p>

                  <div className="d-flex justify-content-end gap-2">
                    <Link to={id ? `/admin/users/${id}` : '/admin/users'} className="btn btn-outline-secondary">
                      Cancel
                    </Link>
                    <Button variant="primary" onClick={() => setStep('form')}>
                      Next →
                    </Button>
                  </div>
                </>
              )}

              {step === 'form' && (
                <Form noValidate onSubmit={handleSubmit}>
                  <Alert variant="info">
                    This sets a new password directly for {user ? user.fullName : 'this user'}. They'll need to
                    use it on their next sign-in.
                  </Alert>

                  <Form.Group className="mb-3" controlId="resetPasswordEmail">
                    <Form.Label className="fw-bold">Email</Form.Label>
                    <Form.Control type="email" value={user?.email ?? ''} disabled readOnly />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="resetPasswordNew">
                    <Form.Label className="fw-bold">New Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="resetPasswordConfirm">
                    <Form.Label className="fw-bold">Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Confirm new password"
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

                  <div className="d-flex justify-content-between">
                    <Button variant="outline-secondary" onClick={() => setStep('select')}>
                      ← Back
                    </Button>
                    <Button type="submit" variant="primary" disabled={status === 'loading'}>
                      {status === 'loading' ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
