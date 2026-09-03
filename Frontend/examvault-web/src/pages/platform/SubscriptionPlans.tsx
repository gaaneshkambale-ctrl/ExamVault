import { useState } from 'react';
import type { ReactNode } from 'react';
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
//
// Create/Edit modal redesigned to match Create-new-plan.png: icon badge
// header, a 2-column grid of icon+description module cards instead of a
// flat checkbox list, and a selected-count. The mockup's "Activate Plan"
// toggle is deliberately not included - Plan has no isActive/enabled field
// anywhere in this codebase (every seeded/created plan is always
// assignable), so a toggle here would have nothing real to control.
interface PlanFormState {
  name: string;
  description: string;
  includedFeatures: Set<PlanFeature>;
}

const EMPTY_FORM: PlanFormState = { name: '', description: '', includedFeatures: new Set() };

function CrownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
      <path d="M5 19h14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface ModuleInfo {
  feature: PlanFeature;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  description: string;
}

// Icon/color/description per module, in ALL_PLAN_FEATURES order (laid out
// 2-per-row below, matching the mockup's grid exactly).
const MODULE_INFO: ModuleInfo[] = [
  {
    feature: 'Users',
    icon: <UsersIcon />,
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    description: 'Manage users, roles, permissions and organization members.',
  },
  {
    feature: 'Exams',
    icon: <DocumentIcon />,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    description: 'Create, edit and manage exams, sections and schedules.',
  },
  {
    feature: 'ExamTypes',
    icon: <ListIcon />,
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    description: 'Manage exam categories and type configurations.',
  },
  {
    feature: 'LiveMonitoring',
    icon: <MonitorIcon />,
    iconBg: '#ffedd5',
    iconColor: '#ea580c',
    description: 'Monitor live exams, detect violations and take actions.',
  },
  {
    feature: 'Results',
    icon: <BarChartIcon />,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    description: 'View and analyze results, performance and analytics.',
  },
  {
    feature: 'Reports',
    icon: <PieChartIcon />,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    description: 'Access advanced reports and export capabilities.',
  },
  {
    feature: 'Notifications',
    icon: <BellIcon />,
    iconBg: '#fef9c3',
    iconColor: '#ca8a04',
    description: 'Send email and in-app notifications.',
  },
  {
    feature: 'Settings',
    icon: <GearIcon />,
    iconBg: '#f3f4f6',
    iconColor: '#4b5563',
    description: 'Configure system settings and general preferences.',
  },
];

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

      <Modal show={showForm} onHide={closeForm} centered size="lg">
        <Modal.Header closeButton>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 48, height: 48, background: '#eef2ff', color: '#4f46e5' }}
            >
              <CrownIcon />
            </div>
            <div>
              <Modal.Title>{editingPlan ? `Edit ${editingPlan.name}` : 'Create New Plan'}</Modal.Title>
              <div className="text-muted small">Define plan details and select the modules to include.</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {saveMutation.isError && <Alert variant="danger">{extractServerError(saveMutation.error)}</Alert>}

          <div className="fw-bold mb-3">Plan Information</div>
          <Form.Group className="mb-3" controlId="planName">
            <Form.Label>
              Plan Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter plan name"
            />
            <Form.Text className="text-muted">Choose a clear and recognizable name for this plan.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-4" controlId="planDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter plan description"
            />
            <Form.Text className="text-muted">Describe the plan, its purpose and who it's intended for.</Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-1">
            <div className="fw-bold">Included Modules</div>
            <div className="text-muted small">
              {form.includedFeatures.size} of {ALL_PLAN_FEATURES.length} selected
            </div>
          </div>
          <p className="text-muted small mb-3">Select the modules and features that will be available in this plan.</p>

          <Row className="g-2 mb-3">
            {MODULE_INFO.map((mod) => {
              const checked = form.includedFeatures.has(mod.feature);
              return (
                <Col xs={12} md={6} key={mod.feature}>
                  <label
                    className="d-flex align-items-start gap-2 border rounded-3 p-3 mb-0"
                    style={{
                      cursor: 'pointer',
                      borderColor: checked ? '#4f46e5' : undefined,
                      background: checked ? '#f5f5ff' : undefined,
                    }}
                  >
                    <Form.Check
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleFeature(mod.feature)}
                    />
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{ width: 40, height: 40, background: mod.iconBg, color: mod.iconColor }}
                    >
                      {mod.icon}
                    </div>
                    <div>
                      <div className="fw-medium">{PLAN_FEATURE_LABELS[mod.feature]}</div>
                      <div className="text-muted small">{mod.description}</div>
                    </div>
                  </label>
                </Col>
              );
            })}
          </Row>

          <Alert variant="light" className="border small mb-0 d-flex align-items-start gap-2">
            <span className="text-primary flex-shrink-0" style={{ marginTop: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            Super Admin has full access to all modules regardless of the plan.
          </Alert>
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
