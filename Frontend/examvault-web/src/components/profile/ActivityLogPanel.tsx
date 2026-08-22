import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { getMyAuditLogs } from '../../api/auditApi';
import TablePagination from '../reports/TablePagination';
import { DownloadIcon } from '../icons/ActionIcons';
import type { AuditModule } from '../../types/audit';

const MODULES: AuditModule[] = ['Auth', 'Users', 'Exams', 'Questions', 'Results', 'Security'];
const PAGE_SIZE = 10;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function exportCsv(rows: { timestampUtc: string; module: string; activity: string; details: string | null; ipAddress: string | null }[]) {
  const header = ['Date & Time', 'Module', 'Activity', 'Details', 'IP Address'];
  const lines = rows.map((r) =>
    [new Date(r.timestampUtc).toLocaleString(), r.module, r.activity, r.details ?? '', r.ipAddress ?? '']
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `examvault-activity-log-${toDateInputValue(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Real data - reuses the same AuditLog infra the admin Audit Reports page
// already relies on, scoped server-side to the caller's own id. Date range
// and module filter both round-trip to the server for real; the mockup's
// finer "Login Success / Password Changed / ..." activity-type filter has
// no server-side equivalent, so Module (the real filter granularity that
// exists) stands in for it.
export default function ActivityLogPanel() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toDateInputValue(d);
  });
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [module, setModule] = useState<AuditModule | 'All'>('All');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', 'mine', fromDate, toDate, module],
    queryFn: () =>
      getMyAuditLogs(
        new Date(fromDate).toISOString(),
        new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
        module === 'All' ? undefined : module,
      ),
  });

  const items = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.timestampUtc.localeCompare(a.timestampUtc)),
    [data],
  );
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-1">
        <div>
          <h2 className="h6 fw-bold mb-1">Activity Log</h2>
          <p className="text-muted mb-0">View your account activity and recent events.</p>
        </div>
        <Button variant="outline-secondary" size="sm" disabled={items.length === 0} onClick={() => exportCsv(items)}>
          <DownloadIcon size={14} /> Export
        </Button>
      </div>

      <Row className="g-2 mb-3">
        <Col xs={6} md={3}>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col xs={6} md={3}>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col xs={12} md={3}>
          <Form.Select
            value={module}
            onChange={(e) => {
              setModule(e.target.value as AuditModule | 'All');
              setPage(1);
            }}
          >
            <option value="All">All Activities</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <Alert variant="danger">Couldn't load your activity log. Please try again.</Alert>}

      {!isLoading && !isError && (
        <Card className="border-0 shadow-sm">
          <Card.Body className={items.length === 0 ? '' : 'p-0'}>
            {items.length === 0 ? (
              <div className="text-center text-muted py-5">No activity in this range.</div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Date & Time</th>
                      <th>Module</th>
                      <th>Activity</th>
                      <th>Details</th>
                      <th className="pe-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((log) => (
                      <tr key={log.id}>
                        <td className="ps-4">{new Date(log.timestampUtc).toLocaleString()}</td>
                        <td>{log.module}</td>
                        <td>{log.activity}</td>
                        <td className="text-muted small">{log.details ?? '—'}</td>
                        <td className="pe-4">{log.ipAddress ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {!isLoading && !isError && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          rangeStart={items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          rangeEnd={Math.min(page * PAGE_SIZE, items.length)}
          totalCount={items.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
