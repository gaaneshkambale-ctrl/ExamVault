import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { createTenantAdmin } from '../../api/tenantsApi';
import { assignPlanToTenant, listPlans } from '../../api/plansApi';
import { extractServerError } from '../../utils/apiError';
import { PLAN_FEATURE_LABELS } from '../../types/plan';

// Matches org_submenu.png's Organization Details page - all 8 tabs from
// the mockup exist as real nav, but only Overview has any real data
// behind it (Name/Subdomain/Status/Created On, same fields ManageTenants'
// old slide-over showed). Everything else the mockup's Overview shows
// (Organization Code/Type/Plan/Billing/Description, Admin Information,
// Address Information, Subscription Information, Quick Stats, Modules &
// Features) has no backing field anywhere in this codebase - honest
// placeholders throughout, matching every other "not connected yet"
// surface in this console. Add Admin (real) lives on the Admins tab;
// Suspend (real, existing Deactivate) lives in the Actions panel.
const TABS = ['Overview', 'Usage', 'Admins', 'Users', 'Exams', 'Subscriptions', 'Activity Log', 'Settings'] as const;
type DetailTab = (typeof TABS)[number];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between small py-1 border-bottom">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function NotConnected({ label }: { label: string }) {
  return <div className="text-center text-muted small py-5 border rounded-3">"{label}" isn't connected yet.</div>;
}

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: tenants, isLoading } = useTenants();
  const tenant = tenants?.find((t) => t.id === id);
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const currentPlan = plans?.find((p) => p.id === tenant?.planId);

  const [tab, setTab] = useState<DetailTab>('Overview');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const createAdminMutation = useMutation({
    mutationFn: () => createTenantAdmin(tenant!.id, { fullName: adminFullName, email: adminEmail }),
  });

  const assignPlanMutation = useMutation({
    mutationFn: () => assignPlanToTenant(tenant!.id, selectedPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowChangePlan(false);
    },
  });

  const openAddAdmin = () => {
    createAdminMutation.reset();
    setAdminFullName('');
    setAdminEmail('');
    setShowAddAdmin(true);
  };

  const openChangePlan = () => {
    assignPlanMutation.reset();
    setSelectedPlanId(tenant?.planId ?? '');
    setShowChangePlan(true);
  };

  if (isLoading) {
    return (
      <PlatformLayout active="org-details">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </PlatformLayout>
    );
  }

  if (!tenant) {
    return (
      <PlatformLayout active="org-details">
        <div className="text-center text-muted py-5">
          Organization not found. <Link to="/platform/organizations">Back to All Organizations</Link>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout active="org-details">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Organizations / Organization Details</p>
          <Link to="/platform/organizations" className="small text-decoration-none">
            &larr; Back to All Organizations
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <OrgAvatar name={tenant.name} size={56} />
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0">{tenant.name}</h1>
              <Badge bg={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="text-muted small">{tenant.slug}.examvaults.in</div>
            <div className="text-muted small">Tenant ID: {tenant.id}</div>
          </div>
          <div className="d-flex gap-4 small text-muted">
            <div>
              <div>Created On</div>
              <div className="text-body">{new Date(tenant.createdAtUtc).toLocaleDateString()}</div>
            </div>
            <div>
              <div>Plan</div>
              <div className="text-body">{currentPlan?.name ?? '—'}</div>
            </div>
            <div>
              <div>Admin Contact</div>
              <div className="text-body">&mdash;</div>
            </div>
            <div>
              <div>Total Users</div>
              <div className="text-body">&mdash;</div>
            </div>
            <div>
              <div>Total Exams</div>
              <div className="text-body">&mdash;</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="d-flex gap-3 border-bottom mb-3 small flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="btn btn-link p-0 pb-2 text-decoration-none text-nowrap"
            style={t === tab ? { color: '#4f46e5', fontWeight: 600, borderBottom: '2px solid #4f46e5' } : { color: '#6b7280' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          {tab === 'Overview' && (
            <>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Organization Information</h2>
                  <InfoRow label="Organization Name" value={tenant.name} />
                  <InfoRow label="Organization Code" value="—" />
                  <InfoRow label="Subdomain" value={`${tenant.slug}.examvaults.in`} />
                  <InfoRow label="Organization Type" value="—" />
                  <InfoRow label="Plan / Subscription" value={currentPlan?.name ?? '—'} />
                  <InfoRow label="Status" value={tenant.isActive ? 'Active' : 'Inactive'} />
                  <InfoRow label="Registration Date" value={new Date(tenant.createdAtUtc).toLocaleString()} />
                  <InfoRow label="Description" value="—" />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Admin Information</h2>
                  <div className="text-muted small mb-2">
                    No per-organization admin lookup exists yet - use the Admins tab to add one.
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Address Information</h2>
                  <NotConnected label="Address Information" />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Subscription Information</h2>
                  <InfoRow label="Current Plan" value={currentPlan?.name ?? '—'} />
                  <InfoRow label="Plan Description" value={currentPlan?.description ?? '—'} />
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Modules &amp; Features</h2>
                  {!currentPlan || currentPlan.includedFeatures.length === 0 ? (
                    <div className="text-center text-muted small py-3">No modules included in the current plan.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {currentPlan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </>
          )}

          {tab === 'Subscriptions' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-bold mb-0">Subscription</h2>
                  <Button variant="primary" size="sm" onClick={openChangePlan}>
                    Change Plan
                  </Button>
                </div>
                <InfoRow label="Current Plan" value={currentPlan?.name ?? '—'} />
                <InfoRow label="Plan Description" value={currentPlan?.description ?? '—'} />
                <div className="mt-3">
                  <div className="text-muted small mb-2">Included Modules</div>
                  {!currentPlan || currentPlan.includedFeatures.length === 0 ? (
                    <div className="text-muted small">No modules included.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {currentPlan.includedFeatures.map((f) => (
                        <Badge key={f} bg="light" text="dark" className="border">
                          {PLAN_FEATURE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

          {tab === 'Admins' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-bold mb-0">Admins</h2>
                  <Button variant="primary" size="sm" onClick={openAddAdmin}>
                    + Add Admin
                  </Button>
                </div>
                <div className="text-muted small">
                  There's no way yet to list an organization's existing admins from here - adding one still works.
                </div>
              </Card.Body>
            </Card>
          )}

          {tab !== 'Overview' && tab !== 'Admins' && tab !== 'Subscriptions' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <NotConnected label={tab} />
              </Card.Body>
            </Card>
          )}
        </div>

        <div className="col-lg-4">
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Quick Stats</h2>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Users</span>
                <span>&mdash;</span>
              </div>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Exams</span>
                <span>&mdash;</span>
              </div>
              <div className="d-flex justify-content-between small py-1">
                <span className="text-muted">Total Submissions</span>
                <span>&mdash;</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Actions</h2>
              <div className="d-flex flex-column gap-2">
                <Button variant="outline-secondary" size="sm" disabled title="Not connected yet">
                  Edit Organization
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={openChangePlan}>
                  Change Plan / Upgrade
                </Button>
                {tenant.isActive ? (
                  <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                ) : (
                  <Button variant="outline-secondary" size="sm" disabled>
                    Already Suspended
                  </Button>
                )}
                <Button variant="outline-secondary" size="sm" disabled title="Not connected yet">
                  Reset Admin Password
                </Button>
                <Button variant="outline-secondary" size="sm" disabled title="Not connected yet">
                  View Activity Log
                </Button>
                <Button variant="outline-danger" size="sm" disabled title="Not connected yet - no delete endpoint exists">
                  Delete Organization
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Modal show={showAddAdmin} onHide={() => setShowAddAdmin(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Admin to {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createAdminMutation.isError && <Alert variant="danger">{extractServerError(createAdminMutation.error)}</Alert>}
          {createAdminMutation.isSuccess ? (
            <Alert variant="success" className="mb-0">
              Admin created. They can log in at {tenant.slug}.examvaults.in once a password is set.
            </Alert>
          ) : (
            <>
              <Form.Group className="mb-3" controlId="detailAdminFullName">
                <Form.Label>Full Name</Form.Label>
                <Form.Control value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} />
              </Form.Group>
              <Form.Group controlId="detailAdminEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowAddAdmin(false)}>
            {createAdminMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!createAdminMutation.isSuccess && (
            <Button
              variant="primary"
              disabled={!adminFullName.trim() || !adminEmail.trim() || createAdminMutation.isPending}
              onClick={() => createAdminMutation.mutate()}
            >
              {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showChangePlan} onHide={() => setShowChangePlan(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Plan for {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {assignPlanMutation.isError && <Alert variant="danger">{extractServerError(assignPlanMutation.error)}</Alert>}
          <Form.Group controlId="changePlanSelect">
            <Form.Label>Plan</Form.Label>
            <Form.Select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
              <option value="" disabled>
                Select a plan...
              </option>
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowChangePlan(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedPlanId || selectedPlanId === tenant.planId || assignPlanMutation.isPending}
            onClick={() => assignPlanMutation.mutate()}
          >
            {assignPlanMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
