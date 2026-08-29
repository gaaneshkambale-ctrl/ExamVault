import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import ReactivateTenantButton from '../../components/ReactivateTenantButton';
import StartTrialButton from '../../components/StartTrialButton';
import EndTrialButton from '../../components/EndTrialButton';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import {
  createTenantAdmin,
  deleteTenant,
  resetTenantAdminPassword,
  updateTenant,
} from '../../api/tenantsApi';
import { assignPlanToTenant, listPlans } from '../../api/plansApi';
import { listAllUsers } from '../../api/userApi';
import { getAuditLogs } from '../../api/auditApi';
import { extractServerError } from '../../utils/apiError';
import { isValidEmail } from '../../utils/email';
import { PLAN_FEATURE_LABELS } from '../../types/plan';
import { ORGANIZATION_TYPES } from '../../types/tenant';

const ACTIVITY_LOG_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const ACTIVITY_LOG_TO = new Date().toISOString();

// Matches org_submenu.png's Organization Details page - all 8 tabs from
// the mockup exist as real nav. Overview/Admins/Subscriptions/Activity Log
// have real data behind them (Organization Code/Type included, editable
// via the Actions panel's Edit Organization); Usage/Users/Exams/Settings
// still show the mockup's Billing/Address/Quick Stats fields with no
// backing field anywhere in this codebase - honest placeholders, matching
// every other "not connected yet" surface in this console. Add Admin
// (real) lives on the Admins tab; Suspend/Edit/Reset Admin Password/
// Delete (all real) live in the Actions panel.
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

  // Cross-tenant, same query AllUsers.tsx already uses for its Super Admin
  // "see everyone" view - filtered down to this one org below rather than
  // adding a new tenant-scoped endpoint for a feature this small.
  const { data: allUsers } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const tenantAdmins = useMemo(
    () => (allUsers ?? []).filter((u) => u.tenantId === tenant?.id && u.role === 'Admin'),
    [allUsers, tenant?.id],
  );

  const { data: activityLogs, isLoading: isLoadingActivity, isError: isActivityError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(ACTIVITY_LOG_FROM, ACTIVITY_LOG_TO),
    enabled: tab === 'Activity Log',
  });
  const tenantActivityLogs = (activityLogs ?? []).filter((log) => log.tenantId === tenant?.id);

  const [showEditOrg, setShowEditOrg] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editOrgCode, setEditOrgCode] = useState('');
  const [editOrgType, setEditOrgType] = useState('');

  const updateTenantMutation = useMutation({
    mutationFn: () =>
      updateTenant(tenant!.id, {
        name: editName.trim(),
        slug: editSlug.trim(),
        organizationCode: editOrgCode.trim() || null,
        organizationType: editOrgType || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowEditOrg(false);
    },
  });

  const openEditOrg = () => {
    updateTenantMutation.reset();
    setEditName(tenant?.name ?? '');
    setEditSlug(tenant?.slug ?? '');
    setEditOrgCode(tenant?.organizationCode ?? '');
    setEditOrgType(tenant?.organizationType ?? '');
    setShowEditOrg(true);
  };

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetTargetAdminId, setResetTargetAdminId] = useState('');

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetTenantAdminPassword(tenant!.id, resetTargetAdminId),
  });

  const openResetPassword = () => {
    resetPasswordMutation.reset();
    setResetTargetAdminId(tenantAdmins[0]?.id ?? '');
    setShowResetPassword(true);
  };

  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();

  const deleteTenantMutation = useMutation({
    mutationFn: () => deleteTenant(tenant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/platform/organizations');
    },
  });

  const openDeleteOrg = () => {
    deleteTenantMutation.reset();
    setDeleteConfirmText('');
    setShowDeleteOrg(true);
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
              {tenant.isTrial && <Badge bg="info">Trial</Badge>}
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
                  <InfoRow label="Organization Code" value={tenant.organizationCode ?? '—'} />
                  <InfoRow label="Subdomain" value={`${tenant.slug}.examvaults.in`} />
                  <InfoRow label="Organization Type" value={tenant.organizationType ?? '—'} />
                  <InfoRow label="Plan / Subscription" value={currentPlan?.name ?? '—'} />
                  <InfoRow label="Status" value={tenant.isActive ? 'Active' : 'Inactive'} />
                  <InfoRow
                    label="Trial"
                    value={
                      tenant.isTrial && tenant.trialEndsAtUtc
                        ? `Yes - ends ${new Date(tenant.trialEndsAtUtc).toLocaleDateString()}`
                        : 'No'
                    }
                  />
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
                {tenantAdmins.length === 0 ? (
                  <div className="text-center text-muted small py-3">No admins yet. Click "+ Add Admin" to add one.</div>
                ) : (
                  <Table responsive hover size="sm" className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantAdmins.map((admin) => (
                        <tr key={admin.id}>
                          <td>{admin.fullName}</td>
                          <td className="text-muted">{admin.email}</td>
                          <td>
                            <Badge bg={admin.isActive ? 'success' : 'secondary'}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          {tab === 'Activity Log' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className={isLoadingActivity || isActivityError || tenantActivityLogs.length === 0 ? '' : 'p-0'}>
                <h2 className="h6 fw-bold mb-3 px-4 pt-4">Activity Log</h2>
                {isLoadingActivity && (
                  <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" />
                  </div>
                )}
                {isActivityError && (
                  <div className="text-center text-danger py-5">Couldn't load activity log. Please try again.</div>
                )}
                {!isLoadingActivity && !isActivityError && tenantActivityLogs.length === 0 && (
                  <div className="text-center text-muted py-5">No activity recorded for this organization yet.</div>
                )}
                {!isLoadingActivity && !isActivityError && tenantActivityLogs.length > 0 && (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-light">
                      <tr>
                        <th className="ps-4">Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Module</th>
                        <th className="pe-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantActivityLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="ps-4 text-muted" style={{ fontSize: 13 }}>
                            {new Date(log.timestampUtc).toLocaleString()}
                          </td>
                          <td>{log.userName ?? '—'}</td>
                          <td>
                            <Badge bg="light" text="dark" className="border">
                              {log.activity}
                            </Badge>
                          </td>
                          <td className="text-muted">{log.module}</td>
                          <td className="pe-4 text-muted" style={{ fontSize: 13 }}>
                            {log.details ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          {tab !== 'Overview' && tab !== 'Admins' && tab !== 'Subscriptions' && tab !== 'Activity Log' && (
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
                <Button variant="outline-secondary" size="sm" onClick={openEditOrg}>
                  Edit Organization
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={openChangePlan}>
                  Change Plan / Upgrade
                </Button>
                {tenant.isActive ? (
                  <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                ) : (
                  <ReactivateTenantButton tenantId={tenant.id} />
                )}
                {tenant.isTrial ? (
                  <EndTrialButton tenantId={tenant.id} />
                ) : (
                  <StartTrialButton tenantId={tenant.id} tenantName={tenant.name} />
                )}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={tenantAdmins.length === 0}
                  title={tenantAdmins.length === 0 ? 'No admin found for this organization' : undefined}
                  onClick={openResetPassword}
                >
                  Reset Admin Password
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={() => setTab('Activity Log')}>
                  View Activity Log
                </Button>
                <Button variant="outline-danger" size="sm" onClick={openDeleteOrg}>
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
                <Form.Control
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  isInvalid={adminEmail.trim().length > 0 && !isValidEmail(adminEmail)}
                />
                <Form.Control.Feedback type="invalid">Enter a valid email address.</Form.Control.Feedback>
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
              disabled={
                !adminFullName.trim() ||
                !adminEmail.trim() ||
                !isValidEmail(adminEmail) ||
                createAdminMutation.isPending
              }
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

      <Modal show={showEditOrg} onHide={() => setShowEditOrg(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {updateTenantMutation.isError && <Alert variant="danger">{extractServerError(updateTenantMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="editOrgName">
            <Form.Label>Organization Name</Form.Label>
            <Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editOrgSlug">
            <Form.Label>Subdomain</Form.Label>
            <Form.Control value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase())} />
            <Form.Text className="text-muted">
              {editSlug || 'slug'}.examvaults.in - changing this changes the organization's login URL immediately.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="editOrgCode">
            <Form.Label>Organization Code</Form.Label>
            <Form.Control value={editOrgCode} onChange={(e) => setEditOrgCode(e.target.value)} placeholder="e.g. GFU2026" />
          </Form.Group>
          <Form.Group controlId="editOrgType">
            <Form.Label>Organization Type</Form.Label>
            <Form.Select value={editOrgType} onChange={(e) => setEditOrgType(e.target.value)}>
              <option value="">Select type</option>
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowEditOrg(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!editName.trim() || !editSlug.trim() || updateTenantMutation.isPending}
            onClick={() => updateTenantMutation.mutate()}
          >
            {updateTenantMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showResetPassword} onHide={() => setShowResetPassword(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Admin Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetPasswordMutation.isError && <Alert variant="danger">{extractServerError(resetPasswordMutation.error)}</Alert>}
          {resetPasswordMutation.isSuccess ? (
            <>
              <Alert variant="success">
                Password reset and emailed to the admin. Temporary password (also shown here in case email delivery
                is delayed):
              </Alert>
              <div className="d-flex gap-2">
                <Form.Control readOnly value={resetPasswordMutation.data ?? ''} className="font-monospace" />
                <Button
                  variant="outline-secondary"
                  onClick={() => navigator.clipboard.writeText(resetPasswordMutation.data ?? '')}
                >
                  Copy
                </Button>
              </div>
              <div className="text-muted small mt-2">
                The admin will be asked to set their own password on next login.
              </div>
            </>
          ) : (
            <Form.Group controlId="resetPasswordAdminSelect">
              <Form.Label>Admin</Form.Label>
              {tenantAdmins.length > 1 ? (
                <Form.Select value={resetTargetAdminId} onChange={(e) => setResetTargetAdminId(e.target.value)}>
                  {tenantAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName} ({admin.email})
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control readOnly value={tenantAdmins[0] ? `${tenantAdmins[0].fullName} (${tenantAdmins[0].email})` : ''} />
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowResetPassword(false)}>
            {resetPasswordMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!resetPasswordMutation.isSuccess && (
            <Button
              variant="primary"
              disabled={!resetTargetAdminId || resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteOrg} onHide={() => setShowDeleteOrg(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete {tenant.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTenantMutation.isError && <Alert variant="danger">{extractServerError(deleteTenantMutation.error)}</Alert>}
          <Alert variant="danger">
            This permanently deletes <strong>{tenant.name}</strong> and every one of its users. This cannot be undone.
          </Alert>
          <Form.Group controlId="deleteOrgConfirm">
            <Form.Label>
              Type <strong>{tenant.name}</strong> to confirm.
            </Form.Label>
            <Form.Control value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteOrg(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteConfirmText !== tenant.name || deleteTenantMutation.isPending}
            onClick={() => deleteTenantMutation.mutate()}
          >
            {deleteTenantMutation.isPending ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
