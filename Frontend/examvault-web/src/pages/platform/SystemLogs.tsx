import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Form, Modal, Pagination, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { listSystemLogs, resolveSystemLog } from '../../api/systemLogsApi';
import type { SystemErrorLog, SystemLogSeverity } from '../../types/systemLog';

// Real backend error capture - every one of the 9 services (Gateway + 8
// APIs) reports its own unhandled exceptions here via a global exception
// handler. Matches ChatGPT Image Sep 4, 2026, 12_52_46 AM.png's layout;
// the date range is a real preset selector (Last 7/30/90 days) rather
// than the mockup's calendar picker - no calendar component exists
// elsewhere in this console (same call SecurityAuditLogs already made),
// so a bounded set of presets gives real range control without faking one.
// Search/pagination follow SecurityAuditLogs.tsx's exact client-side
// pattern - service/severity/resolved are all filtered client-side too
// (fetched once per range) so the Service dropdown always lists every
// service seen in range, not just whatever's currently filtered in.
const RANGE_OPTIONS = [7, 30, 90] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const REFRESH_INTERVAL_MS = 30000;

const SEVERITY_VARIANT: Record<SystemLogSeverity, string> = {
  Warning: 'warning',
  Error: 'danger',
  Critical: 'dark',
};

function StatCard({
  icon,
  iconBg,
  label,
  value,
  caption,
  valueColor,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: ReactNode;
  caption: string;
  valueColor?: string;
}) {
  return (
    <div className="col-6 col-md-3">
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
            <div className="h4 fw-bold mb-0" style={valueColor ? { color: valueColor } : undefined}>
              {value}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {caption}
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default function SystemLogs() {
  const queryClient = useQueryClient();
  const [rangeDays, setRangeDays] = useState<(typeof RANGE_OPTIONS)[number]>(90);
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [detailsLog, setDetailsLog] = useState<SystemErrorLog | null>(null);

  const { fromUtc, toUtc } = useMemo(
    () => ({
      fromUtc: new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString(),
      toUtc: new Date().toISOString(),
    }),
    [rangeDays],
  );

  const {
    data: logs,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['system-logs', rangeDays],
    queryFn: () => listSystemLogs({ fromUtc, toUtc }),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveSystemLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-logs'] }),
  });

  const services = useMemo(() => [...new Set((logs ?? []).map((l) => l.service))].sort(), [logs]);

  const errorCount = logs?.filter((l) => l.severity === 'Error' || l.severity === 'Critical').length ?? 0;
  const warningCount = logs?.filter((l) => l.severity === 'Warning').length ?? 0;
  const unresolvedCount = logs?.filter((l) => !l.isResolved).length ?? 0;

  const searchQuery = searchText.trim().toLowerCase();
  const filteredLogs = (logs ?? []).filter((log) => {
    if (service && log.service !== service) return false;
    if (severity && log.severity !== severity) return false;
    if (!showResolved && log.isResolved) return false;
    if (!searchQuery) return true;
    return (
      log.message.toLowerCase().includes(searchQuery) ||
      log.service.toLowerCase().includes(searchQuery) ||
      (log.exceptionType ?? '').toLowerCase().includes(searchQuery)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [service, severity, showResolved, searchQuery, rangeDays, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredLogs.length);

  const dateRangeLabel = `${new Date(fromUtc).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(toUtc).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const hasActiveFilters = service !== '' || severity !== '' || showResolved || searchText !== '' || rangeDays !== 90;
  const clearFilters = () => {
    setService('');
    setSeverity('');
    setShowResolved(false);
    setSearchText('');
    setRangeDays(90);
  };

  return (
    <PlatformLayout active="system-logs">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Logs</p>
          <h1 className="h4 fw-bold mb-1 text-primary">System Logs</h1>
          <p className="text-muted mb-0">
            Errors reported by every backend service in real time, so issues can be found and fixed.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center gap-2 border rounded-pill px-3 py-2 small text-muted bg-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dateRangeLabel}
          </span>
          <Button
            variant="outline-secondary"
            className="d-inline-flex align-items-center justify-content-center"
            style={{ width: 38, height: 38 }}
            disabled={isFetching}
            onClick={() => refetch()}
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <StatCard
          label={`Total (${rangeDays} days)`}
          value={logs?.length ?? 0}
          caption="All log entries"
          iconBg="#e0e7ff"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <StatCard
          label="Unresolved"
          value={unresolvedCount}
          caption="Pending resolution"
          valueColor="#d97706"
          iconBg="#fef3c7"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
        <StatCard
          label="Errors"
          value={errorCount}
          caption="Critical issues"
          valueColor="#dc2626"
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
          label="Warnings"
          value={warningCount}
          caption="Warnings detected"
          valueColor="#ca8a04"
          iconBg="#fef9c3"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
        <div className="d-flex gap-2 flex-wrap">
          <Form.Select value={service} onChange={(e) => setService(e.target.value)} style={{ width: 180 }}>
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>
          <Form.Select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ width: 160 }}>
            <option value="">All Severities</option>
            <option value="Error">Error</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </Form.Select>
          <Form.Select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value) as (typeof RANGE_OPTIONS)[number])}
            style={{ width: 160 }}
          >
            {RANGE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </Form.Select>
          <Form.Check
            type="switch"
            id="show-resolved"
            label="Show resolved"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="d-flex align-items-center gap-2"
          />
        </div>
        <div className="d-flex gap-2">
          <Form.Control
            type="search"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
          />
          <Button variant="outline-secondary" disabled={!hasActiveFilters} onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredLogs.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load system logs. Please try again.</div>}

          {!isLoading && !isError && filteredLogs.length === 0 && !showResolved && unresolvedCount === 0 && !searchQuery && !service && !severity && (
            <div className="text-center py-5">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                style={{ width: 56, height: 56, background: '#ede9fe' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              <h2 className="h6 fw-bold mb-1">No unresolved issues</h2>
              <p className="text-muted small mb-3">Everything is running clean. Great job!</p>
              <Button variant="outline-primary" onClick={() => setShowResolved(true)}>
                View All Logs
              </Button>
            </div>
          )}

          {!isLoading && !isError && filteredLogs.length === 0 && (showResolved || searchQuery || service || severity) && (
            <div className="text-center text-muted py-5">No log entries match.</div>
          )}

          {!isLoading && !isError && filteredLogs.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Time</th>
                  <th>Service</th>
                  <th>Severity</th>
                  <th>Message</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                      {new Date(log.timestampUtc).toLocaleString()}
                    </td>
                    <td className="fw-medium">{log.service}</td>
                    <td>
                      <Badge bg={SEVERITY_VARIANT[log.severity]}>{log.severity}</Badge>
                    </td>
                    <td
                      className="text-truncate"
                      style={{ maxWidth: 320, cursor: 'pointer' }}
                      onClick={() => setDetailsLog(log)}
                      title="View details"
                    >
                      {log.message}
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {log.requestMethod && log.requestPath
                        ? `${log.requestMethod} ${log.requestPath}`
                        : (log.exceptionType ?? '—')}
                    </td>
                    <td>
                      <Badge bg={log.isResolved ? 'success' : 'secondary'}>{log.isResolved ? 'Resolved' : 'Open'}</Badge>
                    </td>
                    <td className="pe-4 d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={() => setDetailsLog(log)}>
                        View
                      </Button>
                      {!log.isResolved && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          disabled={resolveMutation.isPending}
                          onClick={() => resolveMutation.mutate(log.id)}
                        >
                          Resolve
                        </Button>
                      )}
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
            Showing {rangeStart} to {rangeEnd} of {filteredLogs.length} results
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

      <Modal show={detailsLog !== null} onHide={() => setDetailsLog(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {detailsLog?.service} &mdash; {detailsLog?.exceptionType ?? detailsLog?.severity}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">{detailsLog?.message}</p>
          <div className="text-muted small mb-3">
            {detailsLog && new Date(detailsLog.timestampUtc).toLocaleString()}
            {detailsLog?.requestMethod && detailsLog?.requestPath && (
              <>
                {' '}
                &middot; {detailsLog.requestMethod} {detailsLog.requestPath}
              </>
            )}
          </div>
          {detailsLog?.stackTrace && (
            <pre className="bg-light p-3 rounded small" style={{ maxHeight: 320, overflow: 'auto' }}>
              {detailsLog.stackTrace}
            </pre>
          )}
        </Modal.Body>
        <Modal.Footer>
          {detailsLog && !detailsLog.isResolved && (
            <Button
              variant="success"
              disabled={resolveMutation.isPending}
              onClick={() => {
                resolveMutation.mutate(detailsLog.id);
                setDetailsLog(null);
              }}
            >
              Mark Resolved
            </Button>
          )}
          <Button variant="outline-secondary" onClick={() => setDetailsLog(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
