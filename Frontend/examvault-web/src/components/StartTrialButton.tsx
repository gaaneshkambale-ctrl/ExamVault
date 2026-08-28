import { useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTenantTrial } from '../api/tenantsApi';

interface StartTrialButtonProps {
  tenantId: string;
  tenantName: string;
}

// Needs an end date, unlike DeactivateTenantButton's plain confirm - Trial
// is manual and Super Admin controlled (see ActionPlan.txt "TRIAL
// ORGANIZATIONS"), so the date has to come from this modal, not a default.
export default function StartTrialButton({ tenantId, tenantName }: StartTrialButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  const startTrialMutation = useMutation({
    mutationFn: () => setTenantTrial(tenantId, true, new Date(endDate).toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowModal(false);
      setEndDate('');
    },
  });

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
