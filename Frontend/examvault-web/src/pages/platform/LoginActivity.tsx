import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Matches security.png's Login Activity screen. Real - every successful
// login already writes a real "User login" Auth-module audit entry (see
// UsersController.Login), this page just filters the same Audit Logs
// data down to those. Location/Device-Browser columns from the mockup
// are dropped rather than faked - no geo-IP lookup or user-agent parsing
// happens when this entry is recorded, only IP address.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

function StatCard({ icon, iconBg, label, value }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode }) {
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
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function LoginActivity() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO),
  });
  const { data: tenants } = useTenants();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const logins = (logs ?? []).filter((log) => log.module === 'Auth' && log.activity === 'User login');
  const uniqueUsers = new Set(logins.map((l) => l.userId)).size;
  const uniqueOrgs = new Set(logins.map((l) => l.tenantId)).size;
  const days = Math.max(1, Math.ceil((Date.now() - new Date(DEFAULT_FROM).getTime()) / (24 * 60 * 60 * 1000)));
  const avgPerDay = (logins.length / days).toFixed(1);

  useEffect(() => {
    setPage(1);
  }, [pageSize, logins.length]);

  const totalPages = Math.max(1, Math.ceil(logins.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogins = logins.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = logins.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, logins.length);

  return (
    <PlatformLayout active="sec-login-activity">
      <p className="text-muted small mb-1">Platform Admin / Security / Login Activity</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Login Activity</h1>
      <p className="text-muted mb-3">Track successful login activities across the platform.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load login activity. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Logins"
              value={logins.length}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              }
            />
            <StatCard
              label="Unique Users"
              value={uniqueUsers}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Organizations"
              value={uniqueOrgs}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                </svg>
              }
            />
            <StatCard
              label="Avg. Logins / Day"
              value={avgPerDay}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
            />
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={logins.length === 0 ? '' : 'p-0'}>
              {logins.length === 0 && <div className="text-center text-muted py-5">No login activity recorded yet.</div>}

              {logins.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">User</th>
                      <th>Organization</th>
                      <th>IP Address</th>
                      <th className="pe-4">Login Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLogins.map((log) => (
                      <tr key={log.id}>
                        <td className="ps-4">{log.userName ?? '—'}</td>
                        <td className="text-muted">{tenantNameById.get(log.tenantId) ?? '—'}</td>
                        <td className="text-muted">{log.ipAddress ?? '—'}</td>
                        <td className="pe-4 text-muted" style={{ fontSize: 13 }}>
                          {new Date(log.timestampUtc).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {logins.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {logins.length} logins
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
