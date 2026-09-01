import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Dropdown, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import UserAvatar from '../../components/UserAvatar';
import DeleteUserButton from '../../components/DeleteUserButton';
import { EditIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { useUsers } from '../../hooks/useUsers';
import { activateUser, deactivateUser, deleteUser } from '../../api/userApi';
import { extractServerError } from '../../utils/apiError';
import { bucketByDay } from '../../utils/dateRange';
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

function KebabIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// Small last-7-days trend line, driven by real user signup dates - same
// day-bucketing pattern ManageExams uses for its stat card sparklines.
function Sparkline({ dates, color }: { dates: string[]; color: string }) {
  const buckets = bucketByDay(dates, {
    from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const width = 72;
  const height = 28;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = width / Math.max(1, buckets.length - 1);
  const points = buckets
    .map((b, i) => `${i * stepX},${height - (b.count / max) * (height - 4) - 2}`)
    .join(' ');

  if (buckets.every((b) => b.count === 0)) {
    return null;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function countCreatedInMonth(dates: string[], monthsAgo: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return dates.filter((d) => monthKey(new Date(d)) === monthKey(target)).length;
}

function percentChangeVsLastMonth(dates: string[]): number | null {
  const thisMonth = countCreatedInMonth(dates, 0);
  const lastMonth = countCreatedInMonth(dates, 1);
  if (lastMonth === 0) {
    return thisMonth === 0 ? null : 100;
  }
  return ((thisMonth - lastMonth) / lastMonth) * 100;
}

interface StatCardProps {
  label: string;
  value: number;
  variant: string;
  icon: ReactNode;
  deltaPercent?: number | null;
  percent?: string | null;
  trendDates: string[];
  trendColor: string;
}

function StatCard({ label, value, variant, icon, deltaPercent, percent, trendDates, trendColor }: StatCardProps) {
  return (
    <Col xs={12} sm={6} lg={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-3 bg-${variant}-subtle text-${variant}-emphasis d-flex align-items-center justify-content-center flex-shrink-0`}
              style={{ width: 44, height: 44 }}
            >
              {icon}
            </div>
            <div>
              <div className="text-muted small">{label}</div>
              <div className="h4 fw-bold mb-0">{value}</div>
              {deltaPercent != null && (
                <div className={`small ${deltaPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(deltaPercent).toFixed(1)}% this month
                </div>
              )}
              {deltaPercent == null && percent && (
                <div className="text-muted" style={{ fontSize: 11 }}>{percent}</div>
              )}
            </div>
          </div>
          <Sparkline dates={trendDates} color={trendColor} />
        </Card.Body>
      </Card>
    </Col>
  );
}

function exportUsersToCsv(users: UserListItem[]) {
  const header = ['Full Name', 'Email', 'Role', 'Status', 'Joined On'];
  const rows = users.map((u) => [
    u.fullName,
    u.email,
    u.role,
    u.isActive ? 'Active' : 'Inactive',
    new Date(u.createdAtUtc).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 8;

export default function ManageUsers() {
  const { data: users, isLoading, isError } = useUsers();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [joinedAfter, setJoinedAfter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const counts = {
    total: users?.length ?? 0,
    admins: users?.filter((u) => u.role === 'Admin').length ?? 0,
    students: users?.filter((u) => u.role === 'Student').length ?? 0,
    active: users?.filter((u) => u.isActive).length ?? 0,
  };

  const totalDelta = users ? percentChangeVsLastMonth(users.map((u) => u.createdAtUtc)) : null;
  const studentsDelta = users
    ? percentChangeVsLastMonth(users.filter((u) => u.role === 'Student').map((u) => u.createdAtUtc))
    : null;
  const adminsDelta = users
    ? percentChangeVsLastMonth(users.filter((u) => u.role === 'Admin').map((u) => u.createdAtUtc))
    : null;

  const activeDatesFor = () => (users ?? []).filter((u) => u.isActive).map((u) => u.createdAtUtc);
  const activePct =
    counts.total === 0 ? null : `${((counts.active / counts.total) * 100).toFixed(1)}% of total`;

  const filteredUsers: UserListItem[] = (users ?? []).filter((user) => {
    if (roleFilter !== 'All' && user.role !== roleFilter) {
      return false;
    }
    if (statusFilter !== 'All' && user.isActive !== (statusFilter === 'Active')) {
      return false;
    }
    if (joinedAfter && new Date(user.createdAtUtc) < new Date(joinedAfter)) {
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
    setSelected(new Set());
  }, [searchText, roleFilter, statusFilter, joinedAfter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

  const resetFilters = () => {
    setSearchText('');
    setRoleFilter('All');
    setStatusFilter('All');
    setJoinedAfter('');
  };

  const allPageSelected = pagedUsers.length > 0 && pagedUsers.every((u) => selected.has(u.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedUsers.forEach((u) => next.delete(u.id));
      } else {
        pagedUsers.forEach((u) => next.add(u.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => deactivateUser(id))),
    onSuccess: () => {
      invalidateUsers();
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => deleteUser(id))),
    onSuccess: () => {
      invalidateUsers();
      setSelected(new Set());
      setShowBulkDeleteConfirm(false);
    },
  });

  const bulkError = bulkDeleteMutation.isError ? extractServerError(bulkDeleteMutation.error) : '';

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate ? activateUser(id) : deactivateUser(id),
    onSuccess: invalidateUsers,
  });

  return (
    <AdminLayout active="All Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">All Users</h1>
          <p className="text-muted mb-0">Manage all users, view details and control access.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" disabled={!users || users.length === 0} onClick={() => exportUsersToCsv(filteredUsers)}>
            Export
          </Button>
          <Link to="/admin/users/create" className="btn btn-primary">
            + Add User
          </Link>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <StatCard
          label="Total Users"
          value={counts.total}
          variant="primary"
          icon={<TotalUsersIcon />}
          deltaPercent={totalDelta}
          trendDates={(users ?? []).map((u) => u.createdAtUtc)}
          trendColor="#4f46e5"
        />
        <StatCard
          label="Students"
          value={counts.students}
          variant="warning"
          icon={<StudentIcon />}
          deltaPercent={studentsDelta}
          trendDates={(users ?? []).filter((u) => u.role === 'Student').map((u) => u.createdAtUtc)}
          trendColor="#f59e0b"
        />
        <StatCard
          label="Admins"
          value={counts.admins}
          variant="info"
          icon={<AdminIcon />}
          deltaPercent={adminsDelta}
          trendDates={(users ?? []).filter((u) => u.role === 'Admin').map((u) => u.createdAtUtc)}
          trendColor="#0dcaf0"
        />
        <StatCard
          label="Active Users"
          value={counts.active}
          variant="success"
          icon={<ActiveIcon />}
          percent={activePct}
          trendDates={activeDatesFor()}
          trendColor="#22c55e"
        />
      </Row>

      <Row className="g-2 mb-2">
        <Col md={4}>
          <Form.Control
            type="search"
            placeholder="Search by name or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'All' | UserRole)}>
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Student">Student</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" className="w-100" onClick={() => setShowMoreFilters((v) => !v)}>
            More Filters
          </Button>
        </Col>
        <Col md={2}>
          <Button variant="outline-secondary" className="w-100" onClick={resetFilters}>
            Reset
          </Button>
        </Col>
      </Row>

      {showMoreFilters && (
        <Row className="g-2 mb-3">
          <Col md={4}>
            <Form.Label className="small text-muted mb-1">Joined After</Form.Label>
            <Form.Control type="date" value={joinedAfter} onChange={(e) => setJoinedAfter(e.target.value)} />
          </Col>
        </Row>
      )}

      <Card className="border-0 shadow-sm mt-3">
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
            <>
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                <Form.Check
                  type="checkbox"
                  label="Select All"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                />
                {selected.size > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">{selected.size} selected</span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={bulkDeactivateMutation.isPending}
                      onClick={() => bulkDeactivateMutation.mutate(Array.from(selected))}
                    >
                      {bulkDeactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Selected'}
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                      Delete Selected
                    </Button>
                  </div>
                )}
              </div>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4" style={{ width: 40 }}></th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined On</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="ps-4">
                        <Form.Check
                          type="checkbox"
                          checked={selected.has(user.id)}
                          onChange={() => toggleOne(user.id)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} userId={user.id} size={32} />
                          <div>
                            <div className="fw-medium">{user.fullName}</div>
                            <div className="text-muted small">{user.email}</div>
                          </div>
                        </div>
                      </td>
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
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View"
                            aria-label={`View ${user.fullName}`}
                          >
                            <ViewIcon />
                          </Link>
                          <Link
                            to={`/admin/users/${user.id}/edit`}
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Edit"
                            aria-label={`Edit ${user.fullName}`}
                          >
                            <EditIcon />
                          </Link>
                          <DeleteUserButton userId={user.id} userName={user.fullName} iconOnly />
                          <Dropdown>
                            <Dropdown.Toggle
                              as="button"
                              bsPrefix="btn"
                              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              aria-label={`More actions for ${user.fullName}`}
                            >
                              <KebabIcon />
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                              <Dropdown.Item
                                disabled={toggleActiveMutation.isPending}
                                onClick={() =>
                                  toggleActiveMutation.mutate({ id: user.id, activate: !user.isActive })
                                }
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredUsers.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredUsers.length} users
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

      <Modal show={showBulkDeleteConfirm} onHide={() => setShowBulkDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete {selected.size} User{selected.size === 1 ? '' : 's'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkError && <Alert variant="danger">{bulkError}</Alert>}
          Are you sure you want to delete the selected user{selected.size === 1 ? '' : 's'}? This cannot be
          undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
