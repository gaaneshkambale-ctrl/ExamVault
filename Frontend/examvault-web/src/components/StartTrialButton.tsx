import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTenantTrial } from '../api/tenantsApi';
import { getPlatformSettings } from '../api/platformSettingsApi';

interface StartTrialButtonProps {
  tenantId: string;
  tenantName: string;
}

// Trial is manual and Super Admin controlled (see ActionPlan.txt "TRIAL
// ORGANIZATIONS"), so the date is always editable here - but now pre-filled
// from the real Tenant Settings > Default Limits "Trial Duration" instead
// of starting empty, still fully overridable per-org before confirming.
export default function StartTrialButton({ tenantId, tenantName }: StartTrialButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();
  const { data: platformSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
    enabled: showModal,
  });

  const startTrialMutation = useMutation({
    mutationFn: () => setTenantTrial(tenantId, true, new Date(endDate).toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowModal(false);
      setEndDate('');
    },
  });

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    if (showModal && !endDate && platformSettings) {
      const defaultEnd = new Date(Date.now() + platformSettings.defaultTrialDurationDays * 24 * 60 * 60 * 1000);
      setEndDate(defaultEnd.toISOString().slice(0, 10));
    }
  }, [showModal, endDate, platformSettings]);

  return (
    <>
      <Button variant="outline-secondary" size="sm" onClick={() => setShowModal(true)}>
        Start Trial
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Start Trial</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Mark <strong>{tenantName}</strong> as a trial organization until a chosen end date.
          </p>
          <Form.Group>
            <Form.Label>Trial ends on</Form.Label>
            <Form.Control type="date" min={minDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Form.Group>
          {startTrialMutation.isError && <Alert variant="danger" className="mt-3 mb-0">Couldn't start the trial. Please try again.</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!endDate || startTrialMutation.isPending} onClick={() => startTrialMutation.mutate()}>
            {startTrialMutation.isPending ? 'Starting...' : 'Start Trial'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
