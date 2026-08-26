import { useState } from 'react';
import { Alert, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { getMyProfile, deactivateMyAccount } from '../../api/userApi';
import { getMyAuditLogs } from '../../api/auditApi';
import { useAuth } from '../../hooks/useAuth';
import { extractServerError } from '../../utils/apiError';

// "Download My Data" pulls together the two things this round scoped it to
// (profile fields + Activity Log) via two already-real, already-
// authenticated endpoints, and composes them into one JSON file client-side
// - no new backend export endpoint, no cross-service aggregation.
async function downloadMyData() {
  const [profile, activity] = await Promise.all([getMyProfile(), getMyAuditLogs()]);
  const payload = { exportedAtUtc: new Date().toISOString(), profile, activity };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `examvault-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function QuickActionsCard() {
  const { user, logout } = useAuth();
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const downloadMutation = useMutation({
    mutationFn: downloadMyData,
    onError: (error) => setDownloadError(extractServerError(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateMyAccount,
    onSuccess: () => logout(),
  });

  return (
    <>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h2 className="h6 fw-bold mb-3">Quick Actions</h2>

          {downloadError && (
            <Alert variant="danger" className="py-2">
              {downloadError}
            </Alert>
          )}

          <div className="d-grid gap-2">
            <Button
              variant="outline-secondary"
              className="text-start d-flex align-items-center justify-content-between"
              disabled={downloadMutation.isPending}
              onClick={() => {
                setDownloadError('');
                downloadMutation.mutate();
              }}
            >
              {downloadMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Preparing download...
                </>
              ) : (
                'Download My Data'
              )}
            </Button>

            {user?.role === 'Student' && (
              <Button
                variant="outline-danger"
                className="text-start"
                onClick={() => setShowDeactivateConfirm(true)}
              >
                Deactivate Account
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal show={showDeactivateConfirm} onHide={() => setShowDeactivateConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Deactivate Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deactivateMutation.isError && (
            <Alert variant="danger">{extractServerError(deactivateMutation.error)}</Alert>
          )}
          Are you sure you want to deactivate your account? You'll be signed out immediately and won't be able to log
          back in until an administrator reactivates it.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeactivateConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate My Account'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
