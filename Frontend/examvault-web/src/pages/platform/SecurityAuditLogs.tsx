import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Form, Pagination, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Matches security.png's Audit Logs screen. Real, not a placeholder - the
// backend already had this data and the right tenant-scoping (Phase 2's
// IsSuperAdmin bypass in NotificationDbContext's AuditLog query filter),
// it was only ever blocked by an Admin-only role gate (fixed same day).
// A year-wide default range keeps this simple - the mockup's date-range
// picker isn't wired since no calendar component exists elsewhere in this
// console yet.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

export default function SecurityAuditLogs() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO),
  });
  const { data: tenants } = useTenants();

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredLogs = (logs ?? []).filter((log) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(log.tenantId) ?? '';
    return (
      log.activity.toLowerCase().includes(searchQuery) ||
      (log.userName ?? '').toLowerCase().includes(searchQuery) ||
      (log.details ?? '').toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  return (
    <PlatformLayout active="sec-audit-logs">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Security / Audit Logs</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Audit Logs</h1>
          <p className="text-muted mb-0">Detailed logs of actions performed by users and system, across every organization.</p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search actions, users, modules..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredLogs.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load audit logs. Please try again.</div>}

          {!isLoading && !isError && filteredLogs.length === 0 && (
            <div className="text-center text-muted py-5">No audit log entries match.</div>
          )}

          {!isLoading && !isError && filteredLogs.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Time</th>
                  <th>User</th>
                  <th>Organization</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Details</th>
                  <th className="pe-4">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                      {new Date(log.timestampUtc).toLocaleString()}
                    </td>
                    <td>{log.userName ?? '—'}</td>
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
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredLogs.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredLogs.length} entries
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
    </PlatformLayout>
  );
}
