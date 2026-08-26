import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { revokeOtherSessions } from '../../api/userApi';

// Trimmed to only what's real this round - see ActionPlan.txt. 2FA,
// Trusted Devices, Account Recovery Email and Restrict-Login-to-IP from the
// mockup are each their own real feature, not shown here as inert toggles.
export default function SecuritySettingsCard() {
  const [signedOut, setSignedOut] = useState(false);

  const revokeMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => setSignedOut(true),
  });

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <h2 className="h6 fw-bold mb-3">Security Settings</h2>

        {signedOut && (
          <Alert variant="success" className="py-2">
            Signed out of all other devices.
          </Alert>
        )}

        <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
          <div>
            <div className="fw-medium small">Logout from All Other Devices</div>
            <div className="text-muted small">Sign out from all devices except this one.</div>
          </div>
          <Button
            variant="outline-danger"
            size="sm"
            disabled={revokeMutation.isPending}
            onClick={() => {
              setSignedOut(false);
              revokeMutation.mutate();
            }}
          >
            {revokeMutation.isPending ? 'Signing out...' : 'Logout All'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
