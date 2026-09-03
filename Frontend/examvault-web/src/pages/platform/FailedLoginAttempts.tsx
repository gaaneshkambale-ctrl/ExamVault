import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Real, same data source as Login Activity (same query key, dedupes the
// fetch) - LoginUserHandler now writes a real "Failed login" Auth-module
// audit entry whenever a known user's password is wrong or their account
// is deactivated (never for an unknown email/tenant - that stays
// unaudited, same "don't reveal whether it exists" principle the login
// flow already follows for its own response).
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

export default function FailedLoginAttempts() {
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

  const failedAttempts = (logs ?? []).filter((log) => log.module === 'Auth' && log.activity === 'Failed login');
  const uniqueUsers = new Set(failedAttempts.map((l) => l.userId)).size;
  const uniqueOrgs = new Set(failedAttempts.map((l) => l.tenantId)).size;
  const uniqueIps = new Set(failedAttempts.map((l) => l.ipAddress).filter(Boolean)).size;

  useEffect(() => {
    setPage(1);
  }, [pageSize, failedAttempts.length]);

  const totalPages = Math.max(1, Math.ceil(failedAttempts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedAttempts = failedAttempts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = failedAttempts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, failedAttempts.length);

  return (
    <PlatformLayout active="sec-failed-logins">
      <p className="text-muted small mb-1">Platform Admin / Security / Failed Login Attempts</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Failed Login Attempts</h1>
      <p className="text-muted mb-3">Wrong passwords and blocked-account login attempts across the platform.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load failed login attempts. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={3} className="g-3 mb-3">
            <StatCard
              label="Failed Attempts"
              value={failedAttempts.length}
              iconBg="#fee2e2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
            />
            <StatCard
              label="Affected Accounts"
              value={uniqueUsers}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Organizations Affected"
              value={uniqueOrgs}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                </svg>
              }
            />
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={failedAttempts.length === 0 ? '' : 'p-0'}>
              {failedAttempts.length === 0 && (
                <div className="text-center text-muted py-5">No failed login attempts recorded yet.</div>
              )}

              {failedAttempts.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">User</th>
                      <th>Organization</th>
                      <th>IP Address</th>
                      <th className="pe-4">Attempt Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAttempts.map((log) => (
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

          {failedAttempts.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {failedAttempts.length} attempts
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
          {uniqueIps > 0 && (
            <div className="text-muted small mt-2">{uniqueIps} distinct IP address(es) involved.</div>
          )}
        </>
      )}
    </PlatformLayout>
  );
}
