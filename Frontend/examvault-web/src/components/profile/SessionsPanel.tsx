import { useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMySessions, revokeOtherSessions, revokeSession } from '../../api/userApi';

export default function SessionsPanel() {
  const queryClient = useQueryClient();
  const [signedOut, setSignedOut] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'me', 'sessions'],
    queryFn: getMySessions,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users', 'me', 'sessions'] });

  const revokeOtherMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => {
      setSignedOut(true);
      invalidate();
    },
  });

  const revokeOneMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: invalidate,
  });

  const activeSessions = (data ?? []).filter((session) => session.status === 'Active');
  const currentSession = activeSessions.find((session) => session.isCurrent);
  const otherSessions = activeSessions.filter((session) => !session.isCurrent);

  return (
    <div>
      <h2 className="h6 fw-bold mb-1">Active Sessions</h2>
      <p className="text-muted mb-4">Devices and browsers currently signed in to your account.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <Alert variant="danger">Couldn't load your sessions. Please try again.</Alert>}

      {!isLoading && !isError && (
        <>
          {currentSession && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-4">
                <h3 className="h6 fw-bold mb-3">Current Session</h3>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <div className="fw-medium">
                      {currentSession.deviceLabel} <Badge bg="success" className="ms-1">This Device</Badge>
                    </div>
                    <div className="text-muted small">IP Address: {currentSession.ipAddress ?? '—'}</div>
                  </div>
                  <div className="text-muted small text-end">
                    Signed In
                    <div className="fw-medium text-dark">{new Date(currentSession.issuedAtUtc).toLocaleString()}</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          <h3 className="h6 fw-bold mb-2">Other Active Sessions</h3>
          <p className="text-muted small mb-3">You are currently signed in on the following devices.</p>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className={otherSessions.length === 0 ? '' : 'p-0'}>
              {otherSessions.length === 0 ? (
                <div className="text-center text-muted py-4">No other active sessions.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-body-tertiary">
                      <tr>
                        <th className="ps-4">Device / Browser</th>
                        <th>IP Address</th>
                        <th>Signed In</th>
                        <th className="pe-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherSessions.map((session) => (
                        <tr key={session.id}>
                          <td className="ps-4 fw-medium">{session.deviceLabel}</td>
                          <td>{session.ipAddress ?? '—'}</td>
                          <td>{new Date(session.issuedAtUtc).toLocaleString()}</td>
                          <td className="pe-4">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              disabled={revokeOneMutation.isPending}
                              onClick={() => revokeOneMutation.mutate(session.id)}
                            >
                              Sign Out
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {signedOut && (
            <Alert variant="success" className="mb-3">
              Your other sessions have been signed out.
            </Alert>
          )}

          <Alert variant="danger" className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-0">
            <div>
              <div className="fw-bold">Sign Out From All Other Sessions</div>
              <div className="small">This will sign you out from all other devices except this one.</div>
            </div>
            <Button
              variant="danger"
              disabled={revokeOtherMutation.isPending || otherSessions.length === 0}
              onClick={() => {
                setSignedOut(false);
                revokeOtherMutation.mutate();
              }}
            >
              {revokeOtherMutation.isPending ? 'Signing out...' : 'Sign Out All Other Sessions'}
            </Button>
          </Alert>
        </>
      )}
    </div>
  );
}
