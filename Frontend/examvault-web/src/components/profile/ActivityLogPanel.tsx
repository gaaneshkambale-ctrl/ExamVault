import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Spinner, Table } from 'react-bootstrap';
import { getMyAuditLogs } from '../../api/auditApi';

// Real data - reuses the same AuditLog infra the admin Audit Reports page
// already relies on, just scoped server-side to the caller's own id.
export default function ActivityLogPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', 'mine'],
    queryFn: getMyAuditLogs,
  });

  const items = data ?? [];

  return (
    <div>
      <h2 className="h5 fw-bold mb-1">Activity Log</h2>
      <p className="text-muted mb-4">A record of actions taken on your account over the last year.</p>

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
              <div className="text-center text-muted py-5">No activity recorded yet.</div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Date</th>
                      <th>Module</th>
                      <th>Activity</th>
                      <th className="pe-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((log) => (
                      <tr key={log.id}>
                        <td className="ps-4">{new Date(log.timestampUtc).toLocaleString()}</td>
                        <td>{log.module}</td>
                        <td>{log.activity}</td>
                        <td className="pe-4 text-muted small">{log.details ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
