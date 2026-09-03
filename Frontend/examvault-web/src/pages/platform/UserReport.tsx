import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Dropdown, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import LineTrendChart from '../../components/charts/LineTrendChart';
import ReportFilters from '../../components/reports/ReportFilters';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';
import { bucketByDay, getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { PlatformUserListItem } from '../../types/user';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const ROLE_LABELS: Record<string, string> = {
  Student: 'Student',
  Instructor: 'Instructor',
  Admin: 'Organization Admin',
  SuperAdmin: 'Platform Admin',
};

const ROLE_BADGE: Record<string, string> = {
  Student: 'info',
  Instructor: 'primary',
  Admin: 'success',
  SuperAdmin: 'dark',
};

type RoleFilter = 'all' | PlatformUserListItem['role'];

function StatCard({ icon, iconBg, label, value, caption }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode; caption?: string }) {
  return (
    <Col>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex gap-3 align-items-start">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: iconBg }}
          >
            {icon}
          </span>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">{value}</div>
            {caption && <div className="text-muted small">{caption}</div>}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

// Matches b.user report.png's User Report screen. Real throughout - same
// cross-tenant listAllUsers list AllUsers.tsx already uses. Adds Instructor
// to the role breakdown (the original version of this page only tracked
// Admin/Student/SuperAdmin - the same missing-Instructor gap already found
// and fixed on AllUsers.tsx earlier this session). No per-user View action
// - AllUsers.tsx itself has none either, there's no SuperAdmin-facing user
// details page anywhere in this codebase.
export default function UserReport() {
  const { data: users, isLoading, isError } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: tenants } = useTenants();

  const [range, setRange] = useState<DateRange>(() => getDefaultRange(14));
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const counts = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      Admin: list.filter((u) => u.role === 'Admin').length,
      Student: list.filter((u) => u.role === 'Student').length,
      Instructor: list.filter((u) => u.role === 'Instructor').length,
      SuperAdmin: list.filter((u) => u.role === 'SuperAdmin').length,
      active: list.filter((u) => u.isActive).length,
      inactive: list.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const trendBuckets = useMemo(() => bucketByDay((users ?? []).map((u) => u.createdAtUtc), range), [users, range]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    return (users ?? []).filter((u) => {
      if (!isWithinRange(u.createdAtUtc, range)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!searchQuery) return true;
      const orgName = tenantNameById.get(u.tenantId) ?? '';
      return (
        u.fullName.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery) ||
        orgName.toLowerCase().includes(searchQuery)
      );
    });
  }, [users, range, roleFilter, searchQuery, tenantNameById]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, range, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredUsers.length);

  return (
    <PlatformLayout active="reports-users">
      <div className="mb-1">
        <p className="text-muted small mb-1">Platform Admin / Reports / User Report</p>
        <h1 className="h4 fw-bold mb-1 text-primary">User Report</h1>
        <p className="text-muted mb-0">Overview of users across every organization.</p>
      </div>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange(14));
          setSearchText('');
          setRoleFilter('all');
        }}
        exportFilename="user-report"
        exportHeaders={['User', 'Email', 'Role', 'Organization', 'Status', 'Joined On', 'Last Active']}
        exportRows={() =>
          filteredUsers.map((u) => [
            u.fullName,
            u.email,
            ROLE_LABELS[u.role] ?? u.role,
            tenantNameById.get(u.tenantId) ?? '',
            u.isActive ? 'Active' : 'Inactive',
            new Date(u.createdAtUtc).toISOString(),
            u.lastLoginAtUtc ? new Date(u.lastLoginAtUtc).toISOString() : '',
          ])
        }
      >
        <Col xs="auto">
          <Form.Control
            type="search"
            size="sm"
            placeholder="Search users..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm">
              {roleFilter === 'all' ? 'All Roles' : ROLE_LABELS[roleFilter]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                All Roles
              </Dropdown.Item>
              {(['Student', 'Instructor', 'Admin', 'SuperAdmin'] as const).map((role) => (
                <Dropdown.Item key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
                  {ROLE_LABELS[role]}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </ReportFilters>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load users. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Users"
              value={counts.total}
              caption="All users across platform"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Active Users"
              value={counts.active}
              caption={counts.total === 0 ? undefined : `${((counts.active / counts.total) * 100).toFixed(2)}% of total users`}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
            />
            <StatCard
              label="Students"
              value={counts.Student}
              caption={counts.total === 0 ? undefined : `${((counts.Student / counts.total) * 100).toFixed(2)}% of total users`}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              }
            />
            <StatCard
              label="Organization Admins"
              value={counts.Admin}
              caption={counts.total === 0 ? undefined : `${((counts.Admin / counts.total) * 100).toFixed(2)}% of total users`}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">New Users Trend</h2>
                  <LineTrendChart
                    height={220}
                    series={[{ name: 'New Users', color: '#7c3aed', data: trendBuckets.map((b) => ({ label: b.label, value: b.count })) }]}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Users by Role</h2>
                  <SegmentDonutChart
                    centerLabel="Total"
                    segments={[
                      { label: 'Students', value: counts.Student, color: '#2563eb' },
                      { label: 'Instructors', value: counts.Instructor, color: '#0ea5e9' },
                      { label: 'Organization Admins', value: counts.Admin, color: '#16a34a' },
                      { label: 'Platform Admins', value: counts.SuperAdmin, color: '#7c3aed' },
                    ]}
                  />
                  <div className="d-flex flex-column gap-1 mt-2 small">
                    {[
                      { label: 'Students', value: counts.Student, color: '#2563eb' },
                      { label: 'Instructors', value: counts.Instructor, color: '#0ea5e9' },
                      { label: 'Organization Admins', value: counts.Admin, color: '#16a34a' },
                      { label: 'Platform Admins', value: counts.SuperAdmin, color: '#7c3aed' },
                    ].map((row) => (
                      <div key={row.label} className="d-flex justify-content-between">
                        <span>
                          <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: row.color }} />
                          {row.label}
                        </span>
                        <span>
                          {row.value} ({counts.total === 0 ? '0' : ((row.value / counts.total) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={filteredUsers.length === 0 ? '' : 'p-0'}>
              <div className="px-4 pt-3 pb-2">
                <h2 className="h6 fw-bold mb-0">User Overview</h2>
              </div>
              {filteredUsers.length === 0 ? (
                <div className="text-center text-muted py-5">No users match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">User</th>
                      <th>Role</th>
                      <th>Organization</th>
                      <th>Status</th>
                      <th>Joined On</th>
                      <th className="pe-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold text-white flex-shrink-0"
                              style={{ width: 32, height: 32, background: '#4f46e5', fontSize: 12 }}
                            >
                              {u.fullName.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <div className="fw-medium">{u.fullName}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg={ROLE_BADGE[u.role] ?? 'secondary'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="text-muted">{tenantNameById.get(u.tenantId) ?? '—'}</td>
                        <td>
                          <Badge bg={u.isActive ? 'success' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td>{new Date(u.createdAtUtc).toLocaleDateString()}</td>
                        <td className="pe-4 text-muted">{u.lastLoginAtUtc ? new Date(u.lastLoginAtUtc).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {filteredUsers.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {filteredUsers.length} users
              </div>
              <div className="d-flex align-items-center gap-3">
                <Pagination className="mb-0">
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                      {p}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                </Pagination>
                <Form.Select size="sm" style={{ width: 100 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          )}
        </>
      )}
    </PlatformLayout>
  );
}
