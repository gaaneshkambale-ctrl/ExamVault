import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Dropdown, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportFilters from '../../components/reports/ReportFilters';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';
import { listAllUsers } from '../../api/userApi';
import { getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AuditModule } from '../../types/audit';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Organization Admin',
  Student: 'Student',
  Instructor: 'Instructor',
  SuperAdmin: 'Platform Admin',
};

const MODULES: AuditModule[] = ['Auth', 'Users', 'Exams', 'Questions', 'Results', 'Security'];

type ModuleFilter = 'all' | AuditModule;

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

// Matches e.audit report.png's Audit Reports screen. Real throughout - same
// SuperAdmin cross-tenant GET /api/audit-logs Security > Audit Logs already
// uses, with Role (joined against listAllUsers by userId) and IP Address
// (a real field on AuditLogResponse, previously fetched but not shown)
// added. Active Sessions/API Calls stay honest placeholders, same as
// Platform Usage - no session tracking or API-call metering exists
// anywhere in this codebase. No Actions column - there's nothing real to
// do with one audit log row (no revert/detail-drilldown feature exists),
// so it's left out rather than adding a decorative kebab menu.
export default function AuditReports() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO),
  });
  const { data: tenants } = useTenants();
  const { data: users } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const [range, setRange] = useState<DateRange>(() => getDefaultRange(30));
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const roleByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (users ?? []).forEach((u) => map.set(u.id, u.role));
    return map;
  }, [users]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredLogs = useMemo(() => {
    return (logs ?? []).filter((log) => {
      if (!isWithinRange(log.timestampUtc, range)) return false;
      if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
      if (!searchQuery) return true;
      const orgName = tenantNameById.get(log.tenantId) ?? '';
      return (
        log.activity.toLowerCase().includes(searchQuery) ||
        (log.userName ?? '').toLowerCase().includes(searchQuery) ||
        (log.details ?? '').toLowerCase().includes(searchQuery) ||
        orgName.toLowerCase().includes(searchQuery)
      );
    });
  }, [logs, range, moduleFilter, searchQuery, tenantNameById]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, moduleFilter, range, pageSize]);

  const totalActions = filteredLogs.length;
  const uniqueUsers = new Set(filteredLogs.map((l) => l.userId).filter(Boolean)).size;

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  return (
    <PlatformLayout active="reports-audit">
      <div className="mb-1">
        <p className="text-muted small mb-1">Platform Admin / Reports / Audit Reports</p>
        <h1 className="h4 fw-bold mb-1 text-primary">Audit Reports</h1>
        <p className="text-muted mb-0">Actions performed by users and system, across every organization.</p>
      </div>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange(30));
          setSearchText('');
          setModuleFilter('all');
        }}
        exportFilename="audit-report"
        exportHeaders={['Time', 'User', 'Role', 'Organization', 'Action', 'Module', 'Details', 'IP Address']}
        exportRows={() =>
          filteredLogs.map((log) => {
            const role = log.userId ? roleByUserId.get(log.userId) : undefined;
            return [
              new Date(log.timestampUtc).toISOString(),
              log.userName ?? '',
              role ? (ROLE_LABELS[role] ?? role) : '',
              tenantNameById.get(log.tenantId) ?? '',
              log.activity,
              log.module,
              log.details ?? '',
              log.ipAddress ?? '',
            ];
          })
        }
      >
        <Col xs="auto">
          <Form.Control
            type="search"
            size="sm"
            placeholder="Search actions, users, modules..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm">
              {moduleFilter === 'all' ? 'All Modules' : moduleFilter}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item active={moduleFilter === 'all'} onClick={() => setModuleFilter('all')}>
                All Modules
              </Dropdown.Item>
              {MODULES.map((m) => (
                <Dropdown.Item key={m} active={moduleFilter === m} onClick={() => setModuleFilter(m)}>
                  {m}
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

      {isError && <div className="text-center text-danger py-5">Couldn't load audit reports. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Actions"
              value={totalActions}
              caption="All recorded actions"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />
            <StatCard
              label="Unique Users"
              value={uniqueUsers}
              caption="Users who performed actions"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Active Sessions"
              value="—"
              caption="Not connected yet"
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            <StatCard
              label="API Calls"
              value="—"
              caption="Not connected yet"
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={filteredLogs.length === 0 ? '' : 'p-0'}>
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted py-5">No audit log entries match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Organization</th>
                      <th>Action</th>
                      <th>Module</th>
                      <th>Details</th>
                      <th className="pe-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLogs.map((log) => {
                      const role = log.userId ? roleByUserId.get(log.userId) : undefined;
                      return (
                        <tr key={log.id}>
                          <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                            {new Date(log.timestampUtc).toLocaleString()}
                          </td>
                          <td>{log.userName ?? '—'}</td>
                          <td className="text-muted">{role ? (ROLE_LABELS[role] ?? role) : '—'}</td>
                          <td className="text-muted">{tenantNameById.get(log.tenantId) ?? '—'}</td>
                          <td>
                            <Badge bg="light" text="dark" className="border">
                              {log.activity}
                            </Badge>
                          </td>
                          <td className="text-muted">{log.module}</td>
                          <td className="text-muted" style={{ fontSize: 13 }}>
                            {log.details ?? '—'}
                          </td>
                          <td className="pe-4 text-muted" style={{ fontSize: 13 }}>
                            {log.ipAddress ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {filteredLogs.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {filteredLogs.length} actions
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
