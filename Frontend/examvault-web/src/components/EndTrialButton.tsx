import { Button } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTenantTrial } from '../api/tenantsApi';

interface EndTrialButtonProps {
  tenantId: string;
}

// No confirm modal, same reasoning as ReactivateTenantButton - ending a
// trial isn't destructive and is reversible (Start Trial again).
export default function EndTrialButton({ tenantId }: EndTrialButtonProps) {
  const queryClient = useQueryClient();

  const endTrialMutation = useMutation({
    mutationFn: () => setTenantTrial(tenantId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  return (
    <Button variant="outline-secondary" size="sm" disabled={endTrialMutation.isPending} onClick={() => endTrialMutation.mutate()}>
      {endTrialMutation.isPending ? 'Ending...' : 'End Trial'}
    </Button>
  );
}
