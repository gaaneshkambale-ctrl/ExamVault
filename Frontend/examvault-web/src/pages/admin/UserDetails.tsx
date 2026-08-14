import { useState } from 'react';
import { Badge, Card, Col, Nav, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteUserButton from '../../components/DeleteUserButton';
import ToggleUserActiveButton from '../../components/ToggleUserActiveButton';
import { useUser } from '../../hooks/useUsers';
import type { UserRole } from '../../types/user';

const roleVariant: Record<UserRole, string> = {
  Admin: 'primary',
  Student: 'secondary',
};

const tabs = ['Profile', 'Activity', 'Exam History', 'Logs'] as const;
type Tab = (typeof tabs)[number];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useUser(id);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">User Details</h1>
          <p className="text-muted mb-0">View complete information about the user.</p>
        </div>
        <div className="d-flex gap-2">
          {id && user && (
            <>
              <ToggleUserActiveButton userId={id} isActive={user.isActive} />
              <DeleteUserButton userId={id} onDeleted={() => navigate('/admin/users')} />
              <Link to={`/admin/users/${id}/reset-password`} className="btn btn-outline-secondary">
                Reset Password
              </Link>
              <Link to={`/admin/users/${id}/edit`} className="btn btn-primary">
                Edit User
              </Link>
            </>
          )}
          <Link to="/admin/users" className="btn btn-outline-secondary">
            Back to Users
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this user. They may not exist.
            </div>
          )}

          {user && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h2 className="h5 fw-bold mb-1">{user.fullName}</h2>
                  <p className="text-muted mb-0">{user.email}</p>
                </div>
                <div className="d-flex flex-column gap-2 align-items-end">
                  <Badge bg={roleVariant[user.role]}>{user.role}</Badge>
                  <Badge bg={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <Nav variant="tabs" className="mb-4">
                {tabs.map((tab) => (
                  <Nav.Item key={tab}>
                    <Nav.Link active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                      {tab}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>

              {activeTab === 'Profile' && (
                <Row>
                  <Field label="Full Name" value={user.fullName} />
                  <Field label="Email" value={user.email} />
                  <Field label="Phone Number" value={user.phoneNumber ?? '—'} />
                  <Field label="Role" value={user.role} />
                  <Field label="Joined On" value={new Date(user.createdAtUtc).toLocaleString()} />
                </Row>
              )}

              {activeTab !== 'Profile' && (
                <div className="text-center text-muted py-5">
                  {activeTab} isn't tracked yet — there's no data source for it in ExamVault today.
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
