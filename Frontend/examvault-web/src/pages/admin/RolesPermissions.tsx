import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { useRolePermissions, useUpdateRolePermissions } from '../../hooks/useRolePermissions';
import { EditIcon } from '../../components/icons/ActionIcons';
import {
  COSMETIC_PERMISSIONS,
  COSMETIC_ROLE_PERMISSIONS,
  ADMIN_PERMISSIONS,
  STUDENT_PERMISSIONS,
  INSTRUCTOR_PERMISSIONS,
} from '../../constants/cosmeticRolePermissions';
import type { UserRole } from '../../types/user';

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

interface RoleRow {
  role: string;
  description: string;
  variant: string;
  isReal: boolean;
  // Shown while the live permission set is still loading, so nothing
  // flashes empty - once useRolePermissions() resolves, the live set
  // (persisted server-side) takes over as the actual source of truth.
  defaultPermissions: string[];
}

// Super Admin is deliberately not listed here - it's platform-level, never
// assignable or editable from a tenant's own screen, so showing a row that
// can never be interacted with was just confusing. It's still mentioned in
// the banner below for context.
const roles: RoleRow[] = [
  {
    role: 'Admin',
    description: 'Manage exams, questions, AI generation, and users.',
    variant: 'primary',
    isReal: true,
    defaultPermissions: ADMIN_PERMISSIONS,
  },
  {
    role: 'Instructor',
    description: 'Create exams, manage questions and view results.',
    variant: 'warning',
    isReal: true,
    defaultPermissions: INSTRUCTOR_PERMISSIONS,
  },
  {
    role: 'Student',
    description: 'Take exams and view their own results.',
    variant: 'secondary',
    isReal: true,
    defaultPermissions: STUDENT_PERMISSIONS,
  },
  {
    role: 'Viewer',
    description: 'View-only access to reports and results.',
    variant: 'info',
    isReal: false,
    defaultPermissions: COSMETIC_ROLE_PERMISSIONS.Viewer,
  },
];

export default function RolesPermissions() {
  const { user: currentUser } = useAuth();
  const { data: users } = useUsers();
  const { data: liveRolePermissions } = useRolePermissions();
  const updateRolePermissions = useUpdateRolePermissions();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Set<string>>(new Set());

  const countFor = (role: string) => users?.filter((u) => u.role === (role as UserRole)).length ?? 0;

  const permissionsFor = (role: string, fallback: string[]) =>
    liveRolePermissions?.find((r) => r.role === role)?.permissions ?? fallback;

  const assignedPermissions = new Set(roles.flatMap((r) => permissionsFor(r.role, r.defaultPermissions)));
  const unassignedCount = COSMETIC_PERMISSIONS.length - assignedPermissions.size;

  const openEdit = (role: string, fallback: string[]) => {
    setDraftPermissions(new Set(permissionsFor(role, fallback)));
    setEditingRole(role);
  };

  const togglePermission = (perm: string) => {
    setDraftPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const saveEdit = () => {
    if (!editingRole) return;
    updateRolePermissions.mutate(
      { role: editingRole, permissions: [...draftPermissions] },
      { onSuccess: () => setEditingRole(null) },
    );
  };

  return (
    <AdminLayout active="Roles & Permissions">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <p className="text-muted small mb-1">Users / Roles &amp; Permissions</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Roles &amp; Permissions</h1>
          <p className="text-muted mb-0">Manage user roles and their permissions.</p>
        </div>
        <Button variant="primary" disabled title="Custom roles aren't supported yet">
          + Add Role
        </Button>
      </div>

      <Alert variant="secondary" className="small mt-3">
        ExamVault currently supports four authorization roles - <strong>Admin</strong>, <strong>Student</strong>,{' '}
        <strong>Instructor</strong>, and <strong>Super Admin</strong> - enforced by the app's route protections.
        Super Admin is used for platform and tenant management and isn't assignable from this screen. The
        permission checklist below can be edited and is saved per role. Some permissions are now genuinely
        enforced server-side - unchecking one, saving, and logging the affected role back in will actually
        block that action. Others remain informational only until their own backend enforcement is wired up.
      </Alert>

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase bg-light">
              <tr>
                <th className="ps-4">Role Name</th>
                <th>Description</th>
                <th>Users</th>
                <th>Status</th>
                <th className="pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(({ role, description, variant, isReal, defaultPermissions }) => {
                const isOwnRole = role === currentUser?.role;
                const canEdit = isReal && !isOwnRole;
                return (
                  <tr key={role}>
                    <td className="ps-4">
                      <Badge bg={variant}>{role}</Badge>
                    </td>
                    <td>{description}</td>
                    <td className="fw-medium">{isReal ? countFor(role) : 0}</td>
                    <td>
                      <Badge bg={isReal ? 'success' : 'secondary'}>{isReal ? 'Active' : 'Not Available'}</Badge>
                    </td>
                    <td className="pe-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                        title={
                          canEdit
                            ? `Edit ${role} permissions`
                            : isOwnRole
                              ? "You can't edit the permissions of your own role"
                              : `${role} permissions aren't editable from this screen`
                        }
                        disabled={!canEdit}
                        onClick={() => openEdit(role, defaultPermissions)}
                      >
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body className="p-4">
          <SectionHeader icon={<ShieldCheckIcon />} title="Permissions Overview" />
          <Row className="g-4 text-center">
            <Col xs={6} md={3}>
              <div className="text-muted small mb-1">Total Roles</div>
              <div className="h4 fw-bold mb-0">{roles.length}</div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-muted small mb-1">Total Permissions</div>
              <div className="h4 fw-bold mb-0">{COSMETIC_PERMISSIONS.length}</div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-muted small mb-1">Assigned Permissions</div>
              <div className="h4 fw-bold mb-0 text-success">{assignedPermissions.size}</div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-muted small mb-1">Unassigned Permissions</div>
              <div className="h4 fw-bold mb-0 text-warning">{unassignedCount}</div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal show={editingRole !== null} onHide={() => setEditingRole(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit {editingRole} Permissions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            Saving updates {editingRole}'s permission set. Some of these permissions are already enforced
            server-side; others remain informational until their own backend enforcement is wired up.
          </p>
          <Row>
            {COSMETIC_PERMISSIONS.map((perm) => (
              <Col xs={6} key={perm} className="mb-2">
                <Form.Check
                  type="checkbox"
                  id={`edit-perm-${perm}`}
                  label={perm}
                  checked={draftPermissions.has(perm)}
                  onChange={() => togglePermission(perm)}
                />
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setEditingRole(null)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={updateRolePermissions.isPending} onClick={saveEdit}>
            {updateRolePermissions.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
