import { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { listSystemLogs, resolveSystemLog } from '../../api/systemLogsApi';
import type { SystemErrorLog, SystemLogSeverity } from '../../types/systemLog';

// Real backend error capture - every one of the 9 services (Gateway + 8
// APIs) reports its own unhandled exceptions here via a global exception
// handler. No date-range picker (same convention as SecurityAuditLogs -
// no calendar component exists elsewhere in this console): a wide 90-day
// default keeps this simple, filters narrow it down.
const DEFAULT_FROM = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();
const REFRESH_INTERVAL_MS = 30000;

const SEVERITY_VARIANT: Record<SystemLogSeverity, string> = {
  Warning: 'warning',
  Error: 'danger',
  Critical: 'dark',
};

export default function SystemLogs() {
  const queryClient = useQueryClient();
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [detailsLog, setDetailsLog] = useState<SystemErrorLog | null>(null);

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['system-logs', service, severity, showResolved],
    queryFn: () =>
      listSystemLogs({
        fromUtc: DEFAULT_FROM,
        toUtc: DEFAULT_TO,
        service: service || undefined,
        severity: severity || undefined,
        isResolved: showResolved ? undefined : false,
      }),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveSystemLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-logs'] }),
  });

  const services = useMemo(
    () => [...new Set((logs ?? []).map((l) => l.service))].sort(),
    [logs],
  );

  const errorCount = logs?.filter((l) => l.severity === 'Error' || l.severity === 'Critical').length ?? 0;
  const warningCount = logs?.filter((l) => l.severity === 'Warning').length ?? 0;
  const unresolvedCount = logs?.filter((l) => !l.isResolved).length ?? 0;

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
      </div>

      <Row logs={logs} unresolvedCount={unresolvedCount} errorCount={errorCount} warningCount={warningCount} />

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <Form.Select value={service} onChange={(e) => setService(e.target.value)} style={{ width: 200 }}>
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
        <Form.Check
          type="switch"
          id="show-resolved"
          label="Show resolved"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="d-flex align-items-center gap-2"
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || logs?.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load system logs. Please try again.</div>}

          {!isLoading && !isError && logs?.length === 0 && (
            <div className="text-center text-muted py-5">
              {showResolved ? 'No log entries match.' : 'No unresolved issues - everything is running clean.'}
            </div>
          )}

          {!isLoading && !isError && logs && logs.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Service</th>
                  <th>Severity</th>
                  <th>Message</th>
                  <th>When</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="ps-4 fw-medium">{log.service}</td>
                    <td>
                      <Badge bg={SEVERITY_VARIANT[log.severity]}>{log.severity}</Badge>
                    </td>
                    <td
                      className="text-truncate"
                      style={{ maxWidth: 360, cursor: 'pointer' }}
                      onClick={() => setDetailsLog(log)}
                      title="View details"
                    >
                      {log.message}
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {new Date(log.timestampUtc).toLocaleString()}
                    </td>
                    <td>
                      <Badge bg={log.isResolved ? 'success' : 'secondary'}>
                        {log.isResolved ? 'Resolved' : 'Open'}
                      </Badge>
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

function Row({
  logs,
  unresolvedCount,
  errorCount,
  warningCount,
}: {
  logs: SystemErrorLog[] | undefined;
  unresolvedCount: number;
  errorCount: number;
  warningCount: number;
}) {
  return (
    <div className="row g-3 mb-3">
      <div className="col-6 col-md-3">
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="text-muted small mb-1">Total (90 days)</div>
            <div className="h4 fw-bold mb-0">{logs?.length ?? 0}</div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-6 col-md-3">
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="text-muted small mb-1">Unresolved</div>
            <div className="h4 fw-bold mb-0 text-secondary">{unresolvedCount}</div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-6 col-md-3">
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="text-muted small mb-1">Errors</div>
            <div className="h4 fw-bold mb-0 text-danger">{errorCount}</div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-6 col-md-3">
        <Card className="border-0 shadow-sm h-100">
          <Card.Body>
            <div className="text-muted small mb-1">Warnings</div>
            <div className="h4 fw-bold mb-0 text-warning">{warningCount}</div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
