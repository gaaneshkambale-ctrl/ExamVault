import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import ReportFilters from '../../components/reports/ReportFilters';
import { ViewIcon } from '../../components/icons/ActionIcons';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { listAllUsers } from '../../api/userApi';
import { listExams } from '../../api/examApi';
import { getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const TOP_N_OPTIONS = [5, 10, 20];

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

// Matches a.org report.png's Organization Report screen. Real throughout -
// Total/Active/Inactive Organizations and the status donut reuse the same
// tenant list every other Organizations page uses; Total Users/Top
// Organizations by Users/the Organization Overview table's Users, Exams and
// Last Active columns are derived-real, joining the already-fetched
// cross-tenant Users/Exams lists by tenantId (no new backend calls). No
// Submissions column - there is no cross-tenant Submissions endpoint
// anywhere in this codebase (same gap ExamUsageReport.tsx already
// documents), so it's left out rather than faked. The date range scopes
// the Organization Overview table to organizations created in that window
// (stat cards/donut stay "as of now" platform totals, same convention as
// every other Platform Admin snapshot page this session).
export default function OrganizationReport() {
  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError } = useTenants();
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const { data: exams, isLoading: examsLoading } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const [range, setRange] = useState<DateRange>(() => getDefaultRange(365));
  const [topN, setTopN] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((t) => t.isActive).length ?? 0;
  const inactive = total - active;
  const totalUsers = users?.length ?? 0;

  const userCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (users ?? []).forEach((u) => map.set(u.tenantId, (map.get(u.tenantId) ?? 0) + 1));
    return map;
  }, [users]);

  const examCountByTenantId = useMemo(() => {
    const map = new Map<string, number>();
    (exams ?? []).forEach((e) => map.set(e.tenantId, (map.get(e.tenantId) ?? 0) + 1));
    return map;
  }, [exams]);

  const lastActiveByTenantId = useMemo(() => {
    const map = new Map<string, string>();
    (users ?? []).forEach((u) => {
      if (!u.lastLoginAtUtc) return;
      const existing = map.get(u.tenantId);
      if (!existing || new Date(u.lastLoginAtUtc) > new Date(existing)) {
        map.set(u.tenantId, u.lastLoginAtUtc);
      }
    });
    return map;
  }, [users]);

  const topOrganizations = useMemo(() => {
    return [...userCountByTenantId.entries()]
      .map(([tenantId, count]) => ({
        tenantId,
        name: tenants?.find((t) => t.id === tenantId)?.name ?? 'Unknown organization',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  }, [userCountByTenantId, tenants, topN]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredTenants = useMemo(() => {
    return (tenants ?? []).filter((t) => {
      if (!isWithinRange(t.createdAtUtc, range)) return false;
      if (!searchQuery) return true;
      return t.name.toLowerCase().includes(searchQuery) || t.slug.toLowerCase().includes(searchQuery);
    });
  }, [tenants, range, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, range, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredTenants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTenants.length);

  const isLoading = tenantsLoading || usersLoading || examsLoading;

  return (
    <PlatformLayout active="reports-org">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Reports / Organization Report</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Organization Report</h1>
          <p className="text-muted mb-0">Overview and insights of organizations across the platform.</p>
        </div>
      </div>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange(365));
          setSearchText('');
        }}
        exportFilename="organization-report"
        exportHeaders={['Organization', 'Subdomain', 'Status', 'Users', 'Exams', 'Created On', 'Last Active']}
        exportRows={() =>
          filteredTenants.map((t) => [
            t.name,
            `${t.slug}.examvaults.in`,
            t.isActive ? 'Active' : 'Inactive',
            userCountByTenantId.get(t.id) ?? 0,
            examCountByTenantId.get(t.id) ?? 0,
            new Date(t.createdAtUtc).toISOString(),
            lastActiveByTenantId.get(t.id) ? new Date(lastActiveByTenantId.get(t.id)!).toISOString() : '',
          ])
        }
      >
        <Col xs="auto">
          <Form.Control
            type="search"
            size="sm"
            placeholder="Search organization..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
        </Col>
      </ReportFilters>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {tenantsError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

      {!isLoading && !tenantsError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Organizations"
              value={total}
              caption="All organizations on platform"
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                </svg>
              }
            />
            <StatCard
              label="Active Organizations"
              value={active}
              caption={total === 0 ? undefined : `${((active / total) * 100).toFixed(2)}% of total organizations`}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
            />
            <StatCard
              label="Inactive Organizations"
              value={inactive}
              caption={total === 0 ? undefined : `${((inactive / total) * 100).toFixed(2)}% of total organizations`}
              iconBg="#f3f4f6"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
            />
            <StatCard
              label="Total Users"
              value={totalUsers}
              caption="Across all organizations"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Organization Status</h2>
                  <SegmentDonutChart
                    centerLabel="Total"
                    segments={[
                      { label: 'Active', value: active, color: '#16a34a' },
                      { label: 'Inactive', value: inactive, color: '#6b7280' },
                    ]}
                  />
                  <div className="d-flex flex-column gap-1 mt-2 small">
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#16a34a' }} />
                        Active
                      </span>
                      <span>
                        {active} ({total === 0 ? '0' : ((active / total) * 100).toFixed(2)}%)
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#6b7280' }} />
                        Inactive
                      </span>
                      <span>
                        {inactive} ({total === 0 ? '0' : ((inactive / total) * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h6 fw-bold mb-0">Top Organizations by Users</h2>
                    <Form.Select size="sm" style={{ width: 100 }} value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
                      {TOP_N_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          Top {n}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  {topOrganizations.length === 0 && (
                    <div className="text-center text-muted small py-4">No users yet.</div>
                  )}
                  <div className="d-flex flex-column gap-3">
                    {topOrganizations.map((org) => {
                      const pct = totalUsers === 0 ? 0 : (org.count / totalUsers) * 100;
                      return (
                        <div key={org.tenantId}>
                          <div className="d-flex justify-content-between align-items-center small mb-1">
                            <span className="fw-medium">{org.name}</span>
                            <span className="text-muted">
                              {org.count} &middot; {pct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar" style={{ width: `${pct}%`, background: '#4f46e5' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={filteredTenants.length === 0 ? '' : 'p-0'}>
              <div className="px-4 pt-3 pb-2">
                <h2 className="h6 fw-bold mb-0">Organization Overview</h2>
              </div>
              {filteredTenants.length === 0 ? (
                <div className="text-center text-muted py-5">No organizations match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Organization</th>
                      <th>Status</th>
                      <th>Users</th>
                      <th>Exams</th>
                      <th>Created On</th>
                      <th>Last Active</th>
                      <th className="pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTenants.map((tenant) => {
                      const lastActive = lastActiveByTenantId.get(tenant.id);
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
                            <Badge bg={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="text-muted">{userCountByTenantId.get(tenant.id) ?? 0}</td>
                          <td className="text-muted">{examCountByTenantId.get(tenant.id) ?? 0}</td>
                          <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                          <td className="text-muted">{lastActive ? new Date(lastActive).toLocaleDateString() : '—'}</td>
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

          {filteredTenants.length > 0 && (
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
        </>
      )}
    </PlatformLayout>
  );
}
