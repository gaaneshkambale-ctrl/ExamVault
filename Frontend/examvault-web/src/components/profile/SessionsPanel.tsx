import { useState } from 'react';
import { Alert, Badge, Button, Card, ListGroup, Spinner } from 'react-bootstrap';
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
    <div style={{ maxWidth: 640 }}>
      <h2 className="h5 fw-bold mb-1">Active Sessions</h2>
      <p className="text-muted mb-4">Devices and browsers currently signed in to your account.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <Alert variant="danger">Couldn't load your sessions. Please try again.</Alert>}

      {signedOut && (
        <Alert variant="success" className="mb-3">
          Your other sessions have been signed out.
        </Alert>
      )}

      {!isLoading && !isError && (
        <>
          <Card className="border-0 shadow-sm mb-3">
            <ListGroup variant="flush">
              {activeSessions.map((session) => (
                <ListGroup.Item key={session.id} className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <div className="fw-medium">
                      {session.deviceLabel}{' '}
                      {session.isCurrent && (
                        <Badge bg="primary" className="ms-1">
                          Current Session
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted small">
                      Signed in {new Date(session.issuedAtUtc).toLocaleString()}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
              {activeSessions.length === 0 && (
                <ListGroup.Item className="text-muted text-center py-4">No active sessions.</ListGroup.Item>
              )}
            </ListGroup>
          </Card>

          <Button
            variant="outline-danger"
            disabled={revokeMutation.isPending || otherActiveCount === 0}
            onClick={() => {
              setSignedOut(false);
              revokeMutation.mutate();
            }}
          >
            {revokeMutation.isPending ? 'Signing out...' : 'Sign out other sessions'}
          </Button>
        </>
      )}
    </div>
  );
}
