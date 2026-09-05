import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Dropdown, Form, InputGroup, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { BookIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/reports/ReportIcons';
import { ViewIcon } from '../../components/icons/ActionIcons';
import OrgAvatar from '../../components/OrgAvatar';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import ReactivateTenantButton from '../../components/ReactivateTenantButton';
import { useTenants } from '../../hooks/useTenants';
import { listPlans } from '../../api/plansApi';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';
import type { Tenant } from '../../types/tenant';

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

function UsersStatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function daysRemaining(trialEndsAtUtc: string): number {
  return Math.ceil((new Date(trialEndsAtUtc).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function exportOrgsToCsv(
  tenants: Tenant[],
  planNameById: Map<string, string>,
  studentCountByTenantId: Map<string, number>,
  examCountByTenantId: Map<string, number>,
) {
  const header = ['Organization', 'Subdomain', 'Plan', 'Status', 'Students', 'Exams', 'Created On', 'Trial Ends'];
  const rows = tenants.map((t) => [
    t.name,
    `${t.slug}.examvaults.in`,
    planNameById.get(t.planId) ?? '',
    t.isActive ? 'Active' : 'Inactive',
    String(studentCountByTenantId.get(t.id) ?? 0),
    String(examCountByTenantId.get(t.id) ?? 0),
    new Date(t.createdAtUtc).toISOString(),
    t.isTrial && t.trialEndsAtUtc ? new Date(t.trialEndsAtUtc).toISOString() : '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `organizations-and-plans-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type StatusFilter = 'all' | 'active' | 'inactive';

// Matches org&plan.png's Organizations & Plans screen, with the same
// honesty constraint as before (see the prior version of this file, and
// multi_tenant_saas.txt): there is still no billing/subscription-cycle
// model anywhere in this codebase - no price or renewal cadence on Plan, no
// billing-date field on Tenant - so "Amount"/"Next Billing" from the
// mockup are dropped rather than faked. What IS real and directly relevant
// is this session's own trial-expiry feature (Tenant.IsTrial/
// TrialEndsAtUtc + the auto-deactivate job), so "Expiring Soon" and a
// "Trial Ends" column are genuine substitutes for the mockup's invented
// billing-renewal versions of the same idea, not decorative reskins.
export default function OrganizationsAndPlans() {
  const { data: tenants, isLoading, isError } = useTenants();

  // Same real, already-SuperAdmin-accessible cross-tenant queries
  // ManageTenants.tsx/OrganizationDetails.tsx/ExamUsageReport.tsx already
  // use - same query keys so React Query dedupes the cache across pages.
  const { data: plans, isLoading: isLoadingPlans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: allExams, isLoading: isLoadingExams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const planNameById = useMemo(() => {
    const map = new Map<string, string>();
    (plans ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [plans]);

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

  const totalOrganizations = tenants?.length ?? 0;
  const activeOrganizations = (tenants ?? []).filter((t) => t.isActive).length;
  const totalStudents = allUsers?.filter((u) => u.role === 'Student').length ?? 0;
  const totalExams = allExams?.length ?? 0;
  const expiringSoonCount = (tenants ?? []).filter(
    (t) => t.isActive && t.isTrial && t.trialEndsAtUtc && daysRemaining(t.trialEndsAtUtc) >= 0 && daysRemaining(t.trialEndsAtUtc) <= 30,
  ).length;

  const searchQuery = searchText.trim().toLowerCase();
  const filteredTenants = useMemo(() => {
    return (tenants ?? []).filter((t) => {
      if (statusFilter === 'active' && !t.isActive) return false;
      if (statusFilter === 'inactive' && t.isActive) return false;
      if (!searchQuery) return true;
      const planName = planNameById.get(t.planId) ?? '';
      return (
        t.name.toLowerCase().includes(searchQuery) ||
        t.slug.toLowerCase().includes(searchQuery) ||
        planName.toLowerCase().includes(searchQuery)
      );
    });
  }, [tenants, statusFilter, searchQuery, planNameById]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredTenants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTenants.length);

  return (
    <PlatformLayout active="subs-orgs">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Subscriptions / Organizations &amp; Plans</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Organizations &amp; Plans</h1>
          <p className="text-muted mb-0">View and manage plan subscriptions for all organizations on the platform.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <InputGroup style={{ width: 240 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search organization, plan..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
          <Dropdown>
            <Dropdown.Toggle as="button" bsPrefix="btn" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
              <FilterIcon /> {statusFilter === 'all' ? 'All Statuses' : statusFilter === 'active' ? 'Active' : 'Inactive'}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All Statuses
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                Active
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>
                Inactive
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={filteredTenants.length === 0}
            onClick={() => exportOrgsToCsv(filteredTenants, planNameById, studentCountByTenantId, examCountByTenantId)}
          >
            Export
          </button>
        </div>
      </div>

      <Row xs={2} lg={5} className="g-3 my-1">
        <Col>
          <ReportStatCard
            icon={<UsersStatIcon />}
            label="Total Organizations"
            value={String(totalOrganizations)}
            caption="Across the platform"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Active Organizations"
            value={String(activeOrganizations)}
            caption={totalOrganizations === 0 ? '0% of total' : `${((activeOrganizations / totalOrganizations) * 100).toFixed(2)}% of total`}
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<DocumentIcon />}
            label="Total Students"
            value={String(totalStudents)}
            caption="Across all organizations"
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(totalExams)}
            caption="Across all organizations"
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<AlertTriangleIcon />}
            label="Trials Expiring Soon"
            value={String(expiringSoonCount)}
            caption="Within next 30 days"
            iconBg="#fee2e2"
            iconColor="#dc2626"
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
              {searchQuery || statusFilter !== 'all' ? 'No organizations match your filters.' : 'No organizations yet.'}
            </div>
          )}

          {!isLoading && !isError && pagedTenants.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Organization</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Exams</th>
                  <th>Created On</th>
                  <th>Trial Ends</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedTenants.map((tenant) => (
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
                    <td className="text-muted">
                      {isLoadingPlans ? <Spinner animation="border" size="sm" /> : (planNameById.get(tenant.planId) ?? '—')}
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1 align-items-start">
                        <Badge bg={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
                        {tenant.isTrial && (
                          <Badge bg="light" text="dark" className="border">
                            Trial
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-muted">
                      {isLoadingUsers ? <Spinner animation="border" size="sm" /> : (studentCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td className="text-muted">
                      {isLoadingExams ? <Spinner animation="border" size="sm" /> : (examCountByTenantId.get(tenant.id) ?? 0)}
                    </td>
                    <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                    <td>
                      {tenant.isTrial && tenant.trialEndsAtUtc ? (
                        (() => {
                          const remaining = daysRemaining(tenant.trialEndsAtUtc);
                          return (
                            <Badge bg={remaining < 0 ? 'danger' : remaining <= 3 ? 'warning' : 'info'}>
                              {remaining < 0 ? 'Expired' : `${remaining}d left`}
                            </Badge>
                          );
                        })()
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/platform/organizations/${tenant.id}`}
                          className="btn btn-outline-secondary btn-sm"
                          title="View details"
                        >
                          <ViewIcon />
                        </Link>
                        {tenant.isActive ? (
                          <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                        ) : (
                          <ReactivateTenantButton tenantId={tenant.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              <Pagination.Next
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
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
    </PlatformLayout>
  );
}
