import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deactivateTenant } from '../api/tenantsApi';

interface DeactivateTenantButtonProps {
  tenantId: string;
  tenantName: string;
}

export default function DeactivateTenantButton({ tenantId, tenantName }: DeactivateTenantButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowConfirm(false);
    },
  });

  return (
    <>
      <Button variant="outline-danger" size="sm" onClick={() => setShowConfirm(true)}>
        Deactivate
      </Button>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Deactivate Tenant</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to deactivate <strong>{tenantName}</strong>? Its subdomain will stop
          resolving and its users won't be able to log in. You can reactivate it again any time.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
