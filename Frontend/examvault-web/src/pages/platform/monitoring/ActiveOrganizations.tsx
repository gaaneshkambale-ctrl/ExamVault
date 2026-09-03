import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Dropdown, Form, InputGroup, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import ReportStatCard from '../../../components/reports/ReportStatCard';
import LineTrendChart from '../../../components/charts/LineTrendChart';
import { BookIcon } from '../../../components/reports/ReportIcons';
import { ViewIcon } from '../../../components/icons/ActionIcons';
import OrgAvatar from '../../../components/OrgAvatar';
import { useTenants } from '../../../hooks/useTenants';
import { listExams } from '../../../api/examApi';
import { listAllUsers } from '../../../api/userApi';
import { getAuditLogs } from '../../../api/auditApi';
import { getDefaultRange, getPriorPeriod, bucketByDay, computeDelta } from '../../../utils/dateRange';
import type { Tenant } from '../../../types/tenant';
import type { ExamResponse } from '../../../types/exam';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="7" x2="9" y2="7" /><line x1="15" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="9" y2="11" /><line x1="15" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="9" y2="15" /><line x1="15" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function UsersStatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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

type ExamWindowStatus = 'Live' | 'Upcoming';

// Same real Live-vs-Upcoming windowing ActiveExams.tsx/MonitoringOverview.tsx
// already compute from exam.startAtUtc/endAtUtc - duplicated locally per
// this codebase's established per-file convention for small logic like this.
function toWindowStatus(exam: ExamResponse, now: number): ExamWindowStatus | null {
  const startsAt = new Date(exam.startAtUtc!).getTime();
  if (startsAt > now) return 'Upcoming';
  const endsAt = exam.endAtUtc ? new Date(exam.endAtUtc).getTime() : null;
  return endsAt === null || endsAt >= now ? 'Live' : null;
}

function exportOrgsToCsv(
  tenants: Tenant[],
  studentCountByTenantId: Map<string, number>,
  examCountByTenantId: Map<string, number>,
  lastLoginByTenantId: Map<string, string>,
) {
  const header = ['Organization', 'Subdomain', 'Status', 'Students', 'Exams', 'Last Login', 'Created On'];
  const rows = tenants.map((t) => [
    t.name,
    `${t.slug}.examvaults.in`,
    t.isActive ? (t.isTrial ? 'Trial' : 'Active') : 'Inactive',
    String(studentCountByTenantId.get(t.id) ?? 0),
    String(examCountByTenantId.get(t.id) ?? 0),
    lastLoginByTenantId.get(t.id) ? new Date(lastLoginByTenantId.get(t.id)!).toISOString() : '',
    new Date(t.createdAtUtc).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `active-organizations-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'trial';

// Real, cross-tenant data only - see the "System Monitoring" plan this was
// built from. Uptime%/incidents/host-resource metrics from the shared
// mockup have no data source anywhere in this codebase and are left out
// rather than faked; "Exams in Progress" reuses the same real Live-window
// computation as Active Exams, and the Activity Overview sparklines below
// are real too (signups from listAllUsers's createdAtUtc, logins from the
// existing SuperAdmin-scoped GET /api/audit-logs, module "Auth", activity
// "User login" - logged on every successful login by LoginUserHandler.cs).
export default function ActiveOrganizations() {
  const { data: tenants, isLoading, isError } = useTenants();
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: allExams, isLoading: isLoadingExams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const activityRange = useMemo(() => getDefaultRange(7), []);
  const activityPriorRange = useMemo(() => getPriorPeriod(activityRange), [activityRange]);
  const { data: loginLogs } = useQuery({
    queryKey: ['monitoring-login-audit', activityPriorRange.from, activityRange.to],
    queryFn: () => getAuditLogs(`${activityPriorRange.from}T00:00:00Z`, `${activityRange.to}T23:59:59Z`, 'Auth'),
  });

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const studentCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allUsers ?? [])
      .filter((u) => u.role === 'Student')
      .forEach((u) => map.set(u.tenantId, (map.get(u.tenantId) ?? 0) + 1));
    return map;
  }, [allUsers]);

  const examCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (allExams ?? []).forEach((e) => map.set(e.tenantId, (map.get(e.tenantId) ?? 0) + 1));
    return map;
  }, [allExams]);

  const lastLoginByTenantId = useMemo(() => {
    const map = new Map<string, string>();
    (allUsers ?? []).forEach((u) => {
      if (!u.lastLoginAtUtc) return;
      const existing = map.get(u.tenantId);
      if (!existing || new Date(u.lastLoginAtUtc) > new Date(existing)) {
        map.set(u.tenantId, u.lastLoginAtUtc);
      }
    });
    return map;
  }, [allUsers]);

  const activeTenants = useMemo(() => (tenants ?? []).filter((t) => t.isActive), [tenants]);

  const examsInProgress = useMemo(() => {
    const now = Date.now();
    return (allExams ?? []).filter(
      (exam) => exam.status === 'Published' && exam.startAtUtc && toWindowStatus(exam, now) === 'Live',
    ).length;
  }, [allExams]);

  const totalStudents = useMemo(() => (allUsers ?? []).filter((u) => u.role === 'Student').length, [allUsers]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredTenants = useMemo(() => {
    return activeTenants.filter((t) => {
      if (statusFilter === 'inactive') return false;
      if (statusFilter === 'trial' && !t.isTrial) return false;
      if (statusFilter === 'active' && t.isTrial) return false;
      if (!searchQuery) return true;
      return t.name.toLowerCase().includes(searchQuery) || t.slug.toLowerCase().includes(searchQuery);
    });
  }, [activeTenants, statusFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredTenants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTenants.length);

  const signupsCurrent = useMemo(
    () => (allUsers ?? []).filter((u) => new Date(u.createdAtUtc) >= new Date(`${activityRange.from}T00:00:00Z`)).length,
    [allUsers, activityRange],
  );
  const signupsPrior = useMemo(
    () =>
      (allUsers ?? []).filter(
        (u) =>
          new Date(u.createdAtUtc) >= new Date(`${activityPriorRange.from}T00:00:00Z`) &&
          new Date(u.createdAtUtc) <= new Date(`${activityPriorRange.to}T23:59:59Z`),
      ).length,
    [allUsers, activityPriorRange],
  );
  const signupsBuckets = useMemo(
    () => bucketByDay((allUsers ?? []).map((u) => u.createdAtUtc), activityRange),
    [allUsers, activityRange],
  );
  const signupsDelta = computeDelta(signupsCurrent, signupsPrior);

  const loginTimestamps = useMemo(
    () => (loginLogs ?? []).filter((l) => l.activity === 'User login').map((l) => l.timestampUtc),
    [loginLogs],
  );
  const loginsCurrent = useMemo(
    () => loginTimestamps.filter((t) => new Date(t) >= new Date(`${activityRange.from}T00:00:00Z`)).length,
    [loginTimestamps, activityRange],
  );
  const loginsPrior = useMemo(
    () =>
      loginTimestamps.filter(
        (t) =>
          new Date(t) >= new Date(`${activityPriorRange.from}T00:00:00Z`) &&
          new Date(t) <= new Date(`${activityPriorRange.to}T23:59:59Z`),
      ).length,
    [loginTimestamps, activityPriorRange],
  );
  const loginsBuckets = useMemo(() => bucketByDay(loginTimestamps, activityRange), [loginTimestamps, activityRange]);
  const loginsDelta = computeDelta(loginsCurrent, loginsPrior);

  return (
    <PlatformLayout active="mon-active-orgs">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Monitoring / Active Organizations</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Active Organizations</h1>
          <p className="text-muted mb-0">View organizations that are currently active on the platform.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <InputGroup style={{ width: 220 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search organization..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
          <Dropdown>
            <Dropdown.Toggle as="button" bsPrefix="btn" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
              <FilterIcon /> {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : statusFilter === 'trial' ? 'Trial' : 'Inactive'}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                Active
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'trial'} onClick={() => setStatusFilter('trial')}>
                Trial
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={filteredTenants.length === 0}
            onClick={() => exportOrgsToCsv(filteredTenants, studentCountByTenantId, examCountByTenantId, lastLoginByTenantId)}
          >
            Export
          </button>
        </div>
      </div>

      <Row xs={2} lg={4} className="g-3 my-1">
        <Col>
          <ReportStatCard
            icon={<BuildingIcon />}
            label="Active Organizations"
            value={String(activeTenants.length)}
            caption={
              tenants && tenants.length > 0
                ? `${((activeTenants.length / tenants.length) * 100).toFixed(2)}% of total organizations`
                : undefined
            }
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<UsersStatIcon />}
            label="Total Students"
            value={String(totalStudents)}
            caption="Across active organizations"
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(allExams?.length ?? 0)}
            caption="Across active organizations"
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<ClockIcon />}
            label="Exams in Progress"
            value={String(examsInProgress)}
            caption="Right now"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredTenants.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

          {!isLoading && !isError && filteredTenants.length === 0 && (
            <div className="text-center text-muted py-5">
              {searchQuery || statusFilter !== 'all' ? 'No organizations match your filters.' : 'No active organizations.'}
            </div>
          )}

          {!isLoading && !isError && pagedTenants.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Organization</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Exams</th>
                  <th>Last Login</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedTenants.map((tenant) => {
                  const lastLogin = lastLoginByTenantId.get(tenant.id);
                  return (
                    <tr key={tenant.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <OrgAvatar name={tenant.name} size={32} />
                          <div>
                            <div className="fw-medium">{tenant.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {tenant.slug}.examvaults.in
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge bg={tenant.isTrial ? 'warning' : 'success'}>{tenant.isTrial ? 'Trial' : 'Active'}</Badge>
                      </td>
                      <td className="text-muted">
                        {isLoadingUsers ? <Spinner animation="border" size="sm" /> : (studentCountByTenantId.get(tenant.id) ?? 0)}
                      </td>
                      <td className="text-muted">
                        {isLoadingExams ? <Spinner animation="border" size="sm" /> : (examCountByTenantId.get(tenant.id) ?? 0)}
                      </td>
                      <td className="text-muted">{lastLogin ? timeAgo(lastLogin) : '—'}</td>
                      <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                      <td className="pe-4">
                        <Link to={`/platform/organizations/${tenant.id}`} className="btn btn-outline-secondary btn-sm" title="View details">
                          <ViewIcon />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredTenants.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredTenants.length} organizations
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

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body>
          <div className="d-flex align-items-center gap-2 mb-3">
            <CalendarIcon />
            <h2 className="h6 fw-bold mb-0">Activity Overview (Last 7 Days)</h2>
          </div>
          <Row className="g-4">
            <Col md={6}>
              <div className="text-muted small mb-1">New Signups</div>
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <div className="h4 fw-bold mb-0">{signupsCurrent}</div>
                <span className={`small fw-medium ${signupsDelta.direction === 'up' ? 'text-success' : signupsDelta.direction === 'down' ? 'text-danger' : 'text-muted'}`}>
                  {signupsDelta.direction === 'up' && '▲ '}
                  {signupsDelta.direction === 'down' && '▼ '}
                  {signupsDelta.percent === null ? 'New' : `${Math.abs(signupsDelta.percent)}%`} vs last 7 days
                </span>
              </div>
              <LineTrendChart
                height={100}
                series={[{ name: 'Signups', color: '#7c3aed', data: signupsBuckets.map((b) => ({ label: b.label, value: b.count })) }]}
              />
            </Col>
            <Col md={6}>
              <div className="text-muted small mb-1">Active Logins</div>
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <div className="h4 fw-bold mb-0">{loginsCurrent}</div>
                <span className={`small fw-medium ${loginsDelta.direction === 'up' ? 'text-success' : loginsDelta.direction === 'down' ? 'text-danger' : 'text-muted'}`}>
                  {loginsDelta.direction === 'up' && '▲ '}
                  {loginsDelta.direction === 'down' && '▼ '}
                  {loginsDelta.percent === null ? 'New' : `${Math.abs(loginsDelta.percent)}%`} vs last 7 days
                </span>
              </div>
              <LineTrendChart
                height={100}
                series={[{ name: 'Logins', color: '#2563eb', data: loginsBuckets.map((b) => ({ label: b.label, value: b.count })) }]}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
