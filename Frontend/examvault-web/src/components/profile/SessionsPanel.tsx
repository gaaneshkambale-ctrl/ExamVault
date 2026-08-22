import { useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMySessions, revokeOtherSessions } from '../../api/userApi';

export default function SessionsPanel() {
  const queryClient = useQueryClient();
  const [signedOut, setSignedOut] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'me', 'sessions'],
    queryFn: getMySessions,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => {
      setSignedOut(true);
      queryClient.invalidateQueries({ queryKey: ['users', 'me', 'sessions'] });
    },
  });

  const activeSessions = (data ?? []).filter((session) => session.status === 'Active');
  const otherActiveCount = activeSessions.filter((session) => !session.isCurrent).length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-1">
        <div>
          <h2 className="h5 fw-bold mb-1">Active Sessions</h2>
          <p className="text-muted mb-0">Devices and browsers currently signed in to your account.</p>
        </div>
        <Button
          variant="outline-danger"
          disabled={revokeMutation.isPending || otherActiveCount === 0}
          onClick={() => {
            setSignedOut(false);
            revokeMutation.mutate();
          }}
        >
          {revokeMutation.isPending ? 'Signing out...' : 'Sign Out All Other Sessions'}
        </Button>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <Alert variant="danger">Couldn't load your sessions. Please try again.</Alert>}

      {signedOut && (
        <Alert variant="success" className="mt-3">
          Your other sessions have been signed out.
        </Alert>
      )}

      {!isLoading && !isError && (
        <Card className="border-0 shadow-sm mt-3">
          <Card.Body className={activeSessions.length === 0 ? '' : 'p-0'}>
            {activeSessions.length === 0 ? (
              <div className="text-center text-muted py-5">No active sessions.</div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Device / Browser</th>
                      <th>IP Address</th>
                      <th>Signed In</th>
                      <th className="pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="ps-4 fw-medium">{session.deviceLabel}</td>
                        <td>{session.ipAddress ?? '—'}</td>
                        <td>{new Date(session.issuedAtUtc).toLocaleString()}</td>
                        <td className="pe-4">
                          {session.isCurrent ? (
                            <Badge bg="success">Current Session</Badge>
                          ) : (
                            <Badge bg="info">Other Session</Badge>
                          )}
                        </td>
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
