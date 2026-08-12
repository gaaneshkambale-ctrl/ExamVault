import { Badge, Card, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import { useUsers } from '../../hooks/useUsers';
import type { UserRole } from '../../types/user';

const roles: Array<{ role: UserRole; description: string; variant: string }> = [
  {
    role: 'Admin',
    description: 'Full access to exams, questions, AI generation, and user management.',
    variant: 'primary',
  },
  {
    role: 'Student',
    description: 'Can sign in and view their profile. No admin area access.',
    variant: 'secondary',
  },
];

export default function RolesPermissions() {
  const { data: users } = useUsers();

  const countFor = (role: UserRole) => users?.filter((u) => u.role === role).length ?? 0;

  return (
    <AdminLayout active="Roles & Permissions">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Roles &amp; Permissions</h1>
        <p className="text-muted mb-0">
          ExamVault currently has two roles, enforced by the app's route protections.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase bg-light">
              <tr>
                <th className="ps-4">Role Name</th>
                <th>Description</th>
                <th className="pe-4">Users</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(({ role, description, variant }) => (
                <tr key={role}>
                  <td className="ps-4">
                    <Badge bg={variant}>{role}</Badge>
                  </td>
                  <td>{description}</td>
                  <td className="pe-4 fw-medium">{countFor(role)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
