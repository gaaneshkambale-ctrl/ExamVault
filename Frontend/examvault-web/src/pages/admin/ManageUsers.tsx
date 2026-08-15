import { useEffect, useState } from 'react';
import { Badge, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteUserButton from '../../components/DeleteUserButton';
import { useUsers } from '../../hooks/useUsers';
import type { UserListItem, UserRole } from '../../types/user';

const roleVariant: Record<UserRole, string> = {
  Admin: 'primary',
  Student: 'secondary',
};

function TotalUsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
      <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  variant: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, variant, icon }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={4} xl={2}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex align-items-center gap-3">
          <div
            className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
            style={{ width: 44, height: 44 }}
          >
            {icon}
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">{value}</div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

const PAGE_SIZE = 8;

export default function ManageUsers() {
  const { data: users, isLoading, isError } = useUsers();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('Active');
  const [page, setPage] = useState(1);

  const counts = {
    total: users?.length ?? 0,
    admins: users?.filter((u) => u.role === 'Admin').length ?? 0,
    students: users?.filter((u) => u.role === 'Student').length ?? 0,
    active: users?.filter((u) => u.isActive).length ?? 0,
    inactive: users?.filter((u) => !u.isActive).length ?? 0,
  };

  const filteredUsers: UserListItem[] = (users ?? []).filter((user) => {
    if (roleFilter !== 'All' && user.role !== roleFilter) {
      return false;
    }
    if (statusFilter !== 'All' && user.isActive !== (statusFilter === 'Active')) {
      return false;
    }
    const term = searchText.trim().toLowerCase();
    if (term && !user.fullName.toLowerCase().includes(term) && !user.email.toLowerCase().includes(term)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [searchText, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Users</h1>
          <p className="text-muted mb-0">View and manage all users in the system.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/users/import" className="btn btn-outline-primary">
            Import Users
          </Link>
          <Link to="/admin/users/create" className="btn btn-primary">
            + Add User
          </Link>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <StatCard label="Total Users" value={counts.total} variant="primary" icon={<TotalUsersIcon />} />
        <StatCard label="Admins" value={counts.admins} variant="success" icon={<AdminIcon />} />
        <StatCard label="Students" value={counts.students} variant="warning" icon={<StudentIcon />} />
        <StatCard label="Active Users" value={counts.active} variant="success" icon={<ActiveIcon />} />
        <StatCard label="Inactive Users" value={counts.inactive} variant="danger" icon={<InactiveIcon />} />
      </Row>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search by name or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'All' | UserRole)}
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Student">Student</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredUsers.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load users. Please try again.
            </div>
          )}

          {!isLoading && !isError && users?.length === 0 && (
            <div className="text-center text-muted py-5">No users yet.</div>
          )}

          {!isLoading && !isError && users && users.length > 0 && filteredUsers.length === 0 && (
            <div className="text-center text-muted py-5">
              No users match your search/filter.
            </div>
          )}

          {!isLoading && !isError && filteredUsers.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="ps-4 fw-medium">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={roleVariant[user.role]}>{user.role}</Badge>
                    </td>
                    <td>
                      <Badge bg={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{new Date(user.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/users/${user.id}/edit`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          Edit
                        </Link>
                        <DeleteUserButton userId={user.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredUsers.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredUsers.length} entries
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                {p}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </AdminLayout>
  );
}
