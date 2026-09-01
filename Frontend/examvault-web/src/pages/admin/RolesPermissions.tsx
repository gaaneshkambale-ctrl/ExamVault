import { Alert, Badge, Button, Card, Col, Row, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { useUsers } from '../../hooks/useUsers';
import { EditIcon } from '../../components/icons/ActionIcons';
import {
  COSMETIC_PERMISSIONS,
  COSMETIC_ROLE_PERMISSIONS,
  ADMIN_PERMISSIONS,
  STUDENT_PERMISSIONS,
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
  permissions: string[];
}

const roles: RoleRow[] = [
  {
    role: 'Super Admin',
    description: 'Full access to all modules and settings.',
    variant: 'dark',
    isReal: false,
    permissions: COSMETIC_ROLE_PERMISSIONS['Super Admin'],
  },
  {
    role: 'Admin',
    description: 'Manage exams, questions, AI generation, and users.',
    variant: 'primary',
    isReal: true,
    permissions: ADMIN_PERMISSIONS,
  },
  {
    role: 'Instructor',
    description: 'Create exams, manage questions and view results.',
    variant: 'warning',
    isReal: false,
    permissions: COSMETIC_ROLE_PERMISSIONS.Instructor,
  },
  {
    role: 'Student',
    description: 'Take exams and view their own results.',
    variant: 'secondary',
    isReal: true,
    permissions: STUDENT_PERMISSIONS,
  },
  {
    role: 'Viewer',
    description: 'View-only access to reports and results.',
    variant: 'info',
    isReal: false,
    permissions: COSMETIC_ROLE_PERMISSIONS.Viewer,
  },
];

export default function RolesPermissions() {
  const { data: users } = useUsers();

  const countFor = (role: string) => users?.filter((u) => u.role === (role as UserRole)).length ?? 0;

  const assignedPermissions = new Set(roles.flatMap((r) => r.permissions));
  const unassignedCount = COSMETIC_PERMISSIONS.length - assignedPermissions.size;

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
        ExamVault's real authorization only has two roles - <strong>Admin</strong> and <strong>Student</strong> -
        enforced by the app's route protections. The other roles and the permission breakdown below are a
        static preview of a fuller permissions system, not something the backend actually enforces yet.
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
              {roles.map(({ role, description, variant, isReal }) => (
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
                      disabled
                      title="Role editing isn't available yet"
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              ))}
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
    </AdminLayout>
  );
}
