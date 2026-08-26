import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { createPlan, deletePlan, listPlans, updatePlan } from '../../api/plansApi';
import { extractServerError } from '../../utils/apiError';
import { ALL_PLAN_FEATURES, PLAN_FEATURE_LABELS } from '../../types/plan';
import type { Plan, PlanFeature } from '../../types/plan';

// Real Plan CRUD - replaces the old static reference-pricing cards now that
// a real Plan entity + Tenant.PlanId assignment exists (see ActionPlan.txt's
// "SUBSCRIPTION-BASED FEATURE GATING" section). Billing/pricing stays out of
// scope - a Plan is purely a checklist of included Admin console modules,
// enforced for real on the backend via JWT "feature" claims.
interface PlanFormState {
  name: string;
  description: string;
  includedFeatures: Set<PlanFeature>;
}

const EMPTY_FORM: PlanFormState = { name: '', description: '', includedFeatures: new Set() };

export default function SubscriptionPlans() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading, isError } = useQuery({ queryKey: ['plans'], queryFn: listPlans });

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => {
      const request = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        includedFeatures: [...form.includedFeatures],
      };
      return editingPlan ? updatePlan(editingPlan.id, request) : createPlan(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    saveMutation.reset();
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    saveMutation.reset();
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      includedFeatures: new Set(plan.includedFeatures),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const toggleFeature = (feature: PlanFeature) => {
    setForm((prev) => {
      const next = new Set(prev.includedFeatures);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return { ...prev, includedFeatures: next };
    });
  };

  return (
    <PlatformLayout active="subs-plans">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Subscriptions / Plans</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Plans</h1>
          <p className="text-muted mb-0">
            Each plan is a checklist of Admin console modules - enforced on the backend, not just hidden in the UI.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create Plan
        </Button>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load plans. Please try again.</div>}

      {!isLoading && !isError && (
        <Row className="g-3">
          {plans?.map((plan) => (
            <Col key={plan.id} md={6} lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-column">
                  <h2 className="h6 fw-bold mb-1">{plan.name}</h2>
                  {plan.description && <p className="text-muted small mb-2">{plan.description}</p>}
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {plan.includedFeatures.length === 0 ? (
                      <span className="text-muted small">No modules included</span>
                    ) : (
                      plan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))
                    )}
                  </div>
                  <div className="d-flex gap-2 mt-auto">
                    <Button variant="outline-secondary" size="sm" onClick={() => openEdit(plan)}>
                      Edit Plan
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => setDeleteTarget(plan)}>
                      Delete
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
          {plans?.length === 0 && (
            <Col xs={12}>
              <div className="text-center text-muted py-5">No plans yet. Click "+ Create Plan" to add one.</div>
            </Col>
          )}
        </Row>
      )}

      <Modal show={showForm} onHide={closeForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingPlan ? 'Edit Plan' : 'Create Plan'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saveMutation.isError && <Alert variant="danger">{extractServerError(saveMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="planName">
            <Form.Label>Plan Name</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="planDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Form.Group>
          <Form.Label>Included Modules</Form.Label>
          <div className="d-flex flex-column gap-2">
            {ALL_PLAN_FEATURES.map((feature) => (
              <Form.Check
                key={feature}
                type="checkbox"
                id={`feature-${feature}`}
                label={PLAN_FEATURE_LABELS[feature]}
                checked={form.includedFeatures.has(feature)}
                onChange={() => toggleFeature(feature)}
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeForm}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={deleteTarget !== null} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteMutation.isError && <Alert variant="danger">{extractServerError(deleteMutation.error)}</Alert>}
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Organizations still assigned to it
          will block this until they're moved to a different plan first.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
