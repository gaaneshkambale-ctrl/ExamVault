import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Form, Pagination, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Real, backed by AuditModule.Security - previously defined in the audit
// system but never written anywhere. Now records the Super Admin's own
// tenant-lifecycle actions (Deactivate/Reactivate/Delete Organization,
// Reset Admin Password - see TenantsController.RecordSecurityEventAsync).
// TenantId on each entry is the AFFECTED org; userName is the acting
// Super Admin, not the org's own admin.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

const EVENT_BADGE: Record<string, string> = {
  'Organization deactivated': 'warning',
  'Organization reactivated': 'success',
  'Organization deleted': 'danger',
  'Admin password reset': 'info',
};

export default function SecurityEvents() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs', 'Security'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO, 'Security'),
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
  const filteredEvents = (logs ?? []).filter((log) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(log.tenantId) ?? '';
    return (
      log.activity.toLowerCase().includes(searchQuery) ||
      (log.userName ?? '').toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredEvents.length);

  return (
    <PlatformLayout active="sec-events">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Security / Security Events</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Security Events</h1>
          <p className="text-muted mb-0">
            Sensitive platform actions - organization suspend/reactivate/delete, admin password resets.
          </p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search event, admin, organization..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredEvents.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load security events. Please try again.</div>}

          {!isLoading && !isError && filteredEvents.length === 0 && (
            <div className="text-center text-muted py-5">No security events recorded yet.</div>
          )}

          {!isLoading && !isError && filteredEvents.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Time</th>
                  <th>Event</th>
                  <th>Organization</th>
                  <th className="pe-4">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {pagedEvents.map((log) => (
                  <tr key={log.id}>
                    <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                      {new Date(log.timestampUtc).toLocaleString()}
                    </td>
                    <td>
                      <Badge bg={EVENT_BADGE[log.activity] ?? 'secondary'}>{log.activity}</Badge>
                    </td>
                    <td className="text-muted">{tenantNameById.get(log.tenantId) ?? '—'}</td>
                    <td className="pe-4 text-muted">{log.userName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredEvents.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredEvents.length} events
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
