import { Button } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reactivateTenant } from '../api/tenantsApi';

interface ReactivateTenantButtonProps {
  tenantId: string;
}

// No confirm modal, unlike DeactivateTenantButton - reactivating isn't
// destructive (nothing to lose, and it's reversible by deactivating again),
// so a direct click matches this console's risk-proportionate confirmation
// pattern instead of adding friction to a safe action.
export default function ReactivateTenantButton({ tenantId }: ReactivateTenantButtonProps) {
  const queryClient = useQueryClient();

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  return (
    <Button variant="outline-success" size="sm" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate()}>
      {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate'}
    </Button>
  );
}
