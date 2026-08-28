import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { createUser } from '../../api/userApi';
import type { CreateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';
import { COSMETIC_ROLES, ADMIN_PERMISSIONS, STUDENT_PERMISSIONS } from '../../constants/cosmeticRolePermissions';

type CreateUserFormState = CreateUserRequest;

const initialFormState: CreateUserFormState = {
  fullName: '',
  email: '',
  role: 'Student',
  phoneNumber: '',
  rollNumber: '',
};

const USER_ERROR_OVERRIDES = { 409: 'A user with this email already exists.' };

const TABS = ['User Information', 'Role & Access', 'Additional Details'] as const;
type TabKey = (typeof TABS)[number];

export default function CreateUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('User Information');
  const [form, setForm] = useState<CreateUserFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateUserFormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(() => new Set(STUDENT_PERMISSIONS));

  // Only Admin/Student are real, selectable roles (the rest are disabled
  // "not available" options) - same per-role permission sets UserDetails.tsx
  // already uses for its own (read-only) permissions display.
  const rolePermissions = form.role === 'Admin' ? ADMIN_PERMISSIONS : STUDENT_PERMISSIONS;

  const updateField = <K extends keyof CreateUserFormState>(field: K, value: CreateUserFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateRole = (role: UserRole) => {
    updateField('role', role);
    // Irrelevant-to-the-new-role permissions (e.g. "Exams - Create" for a
    // Student) shouldn't stay checked, or even stay visible - reset to
    // that role's own full set, matching its own default-granted list.
    setCheckedPermissions(new Set(role === 'Admin' ? ADMIN_PERMISSIONS : STUDENT_PERMISSIONS));
  };

  const togglePermission = (perm: string) => {
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const goToTab = (target: TabKey) => {
    if (target === 'User Information') {
      setTab(target);
      return;
    }
    const errors: Partial<Record<keyof CreateUserFormState, string>> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!form.email.trim()) errors.email = 'Email is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setTab('User Information');
      return;
    }
    setTab(target);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<keyof CreateUserFormState, string>> = {};
    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setTab('User Information');
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await createUser(form);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/admin/users');
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error, USER_ERROR_OVERRIDES));
    }
  };

  return (
    <AdminLayout active="Add User">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <p className="text-muted small mb-1">Users / Add User</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Add New User</h1>
          <p className="text-muted mb-0">Create a new user account and assign role.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/users/import" className="btn btn-outline-secondary">
            Bulk Import
          </Link>
          <Link to="/admin/users" className="btn btn-outline-secondary">
            &larr; Back to Users
          </Link>
        </div>
      </div>

      {status === 'error' && <Alert variant="danger" className="mt-3">{serverError}</Alert>}

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body className="p-4">
          <div className="d-flex gap-4 border-bottom mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn-link text-decoration-none px-0 pb-2"
                style={{
                  borderBottom: t === tab ? '2px solid #4f46e5' : '2px solid transparent',
                  color: t === tab ? '#4f46e5' : '#6c757d',
                  fontWeight: t === tab ? 600 : 400,
                }}
                onClick={() => goToTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <Form noValidate onSubmit={handleSubmit}>
            {tab === 'User Information' && (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserFullName">
                      <Form.Label className="fw-bold">Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter full name"
                        value={form.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        isInvalid={!!fieldErrors.fullName}
                      />
                      <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserEmail">
                      <Form.Label className="fw-bold">Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email address"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        isInvalid={!!fieldErrors.email}
                      />
                      <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserPhoneNumber">
                      <Form.Label className="fw-bold">Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="Enter phone number (optional)"
                        value={form.phoneNumber}
                        onChange={(e) => updateField('phoneNumber', e.target.value)}
                        isInvalid={!!fieldErrors.phoneNumber}
                      />
                      <Form.Control.Feedback type="invalid">{fieldErrors.phoneNumber}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserRollNumber">
                      <Form.Label className="fw-bold">Roll No.</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter roll number (optional)"
                        value={form.rollNumber ?? ''}
                        onChange={(e) => updateField('rollNumber', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="py-2 small mb-4">
                  A temporary password will be generated and emailed to this address - there's no password
                  field here since the user sets their own on first login. Username and date of birth aren't
                  collected at creation either; the user (or an admin) can fill those in later from Profile.
                </Alert>

                <div className="d-flex justify-content-end">
                  <Button variant="primary" onClick={() => goToTab('Role & Access')}>
                    Next →
                  </Button>
                </div>
              </>
            )}

            {tab === 'Role & Access' && (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4" controlId="createUserRole">
                      <Form.Label className="fw-bold">Select Role</Form.Label>
                      <Form.Select value={form.role} onChange={(e) => updateRole(e.target.value as UserRole)}>
                        <option value="Student">Student</option>
                        <option value="Admin">Admin</option>
                        {COSMETIC_ROLES.map((r) => (
                          <option key={r} value={r} disabled>
                            {r} (not available)
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="py-2 small mb-4">
                  New accounts always start Inactive - they'll be flipped to Active automatically once this
                  person logs in with their temporary password and sets their own.
                </Alert>

                <Alert variant="secondary" className="py-2 small">
                  Only Admin and Student actually control access in ExamVault today. The permission checklist
                  below is a preview of a future permissions system - it isn't saved or enforced yet. Only
                  permissions relevant to the selected role are shown.
                </Alert>

                <div className="mb-1 fw-bold">
                  Permissions ({checkedPermissions.size} of {rolePermissions.length} selected)
                </div>
                <Row className="mb-4">
                  {rolePermissions.map((perm) => (
                    <Col xs={6} md={4} key={perm} className="mb-2">
                      <Form.Check
                        type="checkbox"
                        id={`perm-${perm}`}
                        label={perm}
                        checked={checkedPermissions.has(perm)}
                        onChange={() => togglePermission(perm)}
                      />
                    </Col>
                  ))}
                </Row>

                <div className="d-flex justify-content-between">
                  <Button variant="outline-secondary" onClick={() => setTab('User Information')}>
                    ← Previous
                  </Button>
                  <Button variant="primary" onClick={() => goToTab('Additional Details')}>
                    Next →
                  </Button>
                </div>
              </>
            )}

            {tab === 'Additional Details' && (
              <>
                <p className="text-muted small mb-3">Review the new account before creating it.</p>
                <Row className="mb-4">
                  <Col xs={6} md={4} className="mb-3">
                    <div className="text-muted small mb-1">Full Name</div>
                    <div className="fw-medium">{form.fullName || '—'}</div>
                  </Col>
                  <Col xs={6} md={4} className="mb-3">
                    <div className="text-muted small mb-1">Email</div>
                    <div className="fw-medium">{form.email || '—'}</div>
                  </Col>
                  <Col xs={6} md={4} className="mb-3">
                    <div className="text-muted small mb-1">Phone</div>
                    <div className="fw-medium">{form.phoneNumber || '—'}</div>
                  </Col>
                  <Col xs={6} md={4} className="mb-3">
                    <div className="text-muted small mb-1">Role</div>
                    <Badge bg={form.role === 'Admin' ? 'primary' : 'secondary'}>{form.role}</Badge>
                  </Col>
                  <Col xs={6} md={4} className="mb-3">
                    <div className="text-muted small mb-1">Roll No.</div>
                    <div className="fw-medium">{form.rollNumber || '—'}</div>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between">
                  <Button variant="outline-secondary" onClick={() => setTab('Role & Access')}>
                    ← Previous
                  </Button>
                  <Button type="submit" variant="primary" disabled={status === 'loading'}>
                    {status === 'loading' ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
