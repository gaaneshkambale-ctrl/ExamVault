import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { createUser } from '../../api/userApi';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { UsersIcon } from '../../components/icons/ActionIcons';
import type { CreateUserRequest, UserRole } from '../../types/user';
import { extractServerError } from '../../utils/apiError';
import {
  COSMETIC_ROLES,
  ADMIN_PERMISSIONS,
  STUDENT_PERMISSIONS,
  INSTRUCTOR_PERMISSIONS,
} from '../../constants/cosmeticRolePermissions';

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

function PersonPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IdCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" /><line x1="14" y1="10" x2="19" y2="10" /><line x1="14" y1="14" x2="19" y2="14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ShieldTabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconBadge({ icon, bg, color, size = 44 }: { icon: ReactNode; bg: string; color: string; size?: number }) {
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
      style={{ width: size, height: size, background: bg, color }}
    >
      {icon}
    </div>
  );
}

const FEATURES = [
  {
    icon: <LockIcon />,
    bg: '#ecfdf5',
    color: '#059669',
    title: 'Secure & Safe',
    description: 'All user data is encrypted and stored securely',
  },
  {
    icon: <MailIcon />,
    bg: '#eef2ff',
    color: '#4f46e5',
    title: 'Email Notification',
    description: 'User will receive credentials via email',
  },
  {
    icon: <UsersIcon />,
    bg: '#e0f2fe',
    color: '#0284c7',
    title: 'Role Based Access',
    description: 'Assign appropriate role and permissions',
  },
  {
    icon: <ClockIcon />,
    bg: '#fff7ed',
    color: '#d97706',
    title: 'Easy Management',
    description: 'Manage user profile and permissions anytime',
  },
];

export default function CreateUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('User Information');
  const [form, setForm] = useState<CreateUserFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateUserFormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const { data: liveRolePermissions } = useRolePermissions();

  // Admin/Student/Instructor are real, selectable roles (the rest are
  // disabled "not available" options) - same per-role permission sets
  // UserDetails.tsx already uses for its own (read-only) permissions
  // display. Falls back to the static defaults while the live (editable,
  // persisted on the Roles & Permissions page) set is still loading.
  const permissionsForRole = (role: UserRole) =>
    liveRolePermissions?.find((r) => r.role === role)?.permissions ??
    (role === 'Admin' ? ADMIN_PERMISSIONS : role === 'Instructor' ? INSTRUCTOR_PERMISSIONS : STUDENT_PERMISSIONS);

  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(
    () => new Set(permissionsForRole('Student')),
  );

  const rolePermissions = permissionsForRole(form.role);

  const updateField = <K extends keyof CreateUserFormState>(field: K, value: CreateUserFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateRole = (role: UserRole) => {
    updateField('role', role);
    // Irrelevant-to-the-new-role permissions (e.g. "Exams - Create" for a
    // Student) shouldn't stay checked, or even stay visible - reset to
    // that role's own current set.
    setCheckedPermissions(new Set(permissionsForRole(role)));
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

  const TAB_ICONS: Record<TabKey, ReactNode> = {
    'User Information': <PersonIcon />,
    'Role & Access': <ShieldTabIcon />,
    'Additional Details': <DocumentIcon />,
  };

  return (
    <AdminLayout active="Add User">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div className="d-flex align-items-center gap-3">
          <IconBadge icon={<PersonPlusIcon />} bg="#eef2ff" color="#4f46e5" />
          <div>
            <p className="text-muted small mb-1">Users / Add User</p>
            <h1 className="h4 fw-bold mb-1 text-primary">Add New User</h1>
            <p className="text-muted mb-0">Create a new user account and assign role.</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/users/import" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
            <UploadIcon /> Bulk Import
          </Link>
          <Link to="/admin/users" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
            <ArrowLeftIcon /> Back to Users
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
                className="btn btn-link text-decoration-none px-0 pb-2 d-inline-flex align-items-center gap-2"
                style={{
                  borderBottom: t === tab ? '2px solid #4f46e5' : '2px solid transparent',
                  color: t === tab ? '#4f46e5' : '#6c757d',
                  fontWeight: t === tab ? 600 : 400,
                }}
                onClick={() => goToTab(t)}
              >
                {TAB_ICONS[t]}
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
                      <InputGroup hasValidation>
                        <InputGroup.Text>
                          <PersonIcon />
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Enter full name"
                          value={form.fullName}
                          onChange={(e) => updateField('fullName', e.target.value)}
                          isInvalid={!!fieldErrors.fullName}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.fullName}</Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserEmail">
                      <Form.Label className="fw-bold">Email Address</Form.Label>
                      <InputGroup hasValidation>
                        <InputGroup.Text>
                          <MailIcon />
                        </InputGroup.Text>
                        <Form.Control
                          type="email"
                          placeholder="Enter email address"
                          value={form.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          isInvalid={!!fieldErrors.email}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserPhoneNumber">
                      <Form.Label className="fw-bold">Phone Number</Form.Label>
                      <InputGroup hasValidation>
                        <InputGroup.Text>
                          <PhoneIcon />
                        </InputGroup.Text>
                        <Form.Control
                          type="tel"
                          placeholder="Enter phone number (optional)"
                          value={form.phoneNumber}
                          onChange={(e) => updateField('phoneNumber', e.target.value)}
                          isInvalid={!!fieldErrors.phoneNumber}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.phoneNumber}</Form.Control.Feedback>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="createUserRollNumber">
                      <Form.Label className="fw-bold">Roll No.</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>
                          <IdCardIcon />
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Enter roll number (optional)"
                          value={form.rollNumber ?? ''}
                          onChange={(e) => updateField('rollNumber', e.target.value)}
                        />
                      </InputGroup>
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
                        <option value="Instructor">Instructor</option>
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

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body className="p-4">
          <Row className="g-4">
            {FEATURES.map((f) => (
              <Col xs={12} sm={6} lg={3} key={f.title} className="d-flex align-items-start gap-3">
                <IconBadge icon={f.icon} bg={f.bg} color={f.color} size={40} />
                <div>
                  <div className="fw-bold small">{f.title}</div>
                  <div className="text-muted small">{f.description}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
