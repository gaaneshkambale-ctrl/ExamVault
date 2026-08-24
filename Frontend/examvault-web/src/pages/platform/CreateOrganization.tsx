import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { createTenant, createTenantAdmin } from '../../api/tenantsApi';
import { listPlans } from '../../api/plansApi';
import { extractServerError } from '../../utils/apiError';

// Matches org_submenu.png's Create Organization page. Real fields: Name,
// Subdomain, and (new this pass) Admin Full Name/Email - if both are
// filled, this page makes a second real API call (createTenantAdmin)
// right after the tenant is created, so creating an org and its first
// admin is one step instead of the old create-then-separately-add-admin
// flow. Every other field in the mockup (Org Code, Org Type, Phone,
// Designation, the whole Address section, the 3 toggles) has no backing
// field anywhere in this codebase - shown disabled with a "not saved
// yet" hint rather than silently accepting and discarding input.
export default function CreateOrganization() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants } = useTenants();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [planId, setPlanId] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminWarning, setAdminWarning] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const tenant = await createTenant({ name, slug, planId: planId || undefined });
      if (adminFullName.trim() && adminEmail.trim()) {
        try {
          await createTenantAdmin(tenant.id, { fullName: adminFullName, email: adminEmail });
        } catch (error) {
          setAdminWarning(
            `${tenant.name} was created, but the admin account couldn't be added: ${extractServerError(error)}`,
          );
        }
      }
      return tenant;
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate(`/platform/organizations/${tenant.id}`);
    },
  });

  const activeOrgs = (tenants ?? []).filter((t) => t.isActive).slice(0, 5);
  const suspendedOrgs = (tenants ?? []).filter((t) => !t.isActive).slice(0, 5);

  return (
    <PlatformLayout active="org-create">
      <p className="text-muted small mb-1">Platform Admin / Organizations / Create Organization</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Create Organization</h1>
      <p className="text-muted mb-4">Create a new organization/tenant on the platform.</p>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {createMutation.isError && <Alert variant="danger">{extractServerError(createMutation.error)}</Alert>}
              {adminWarning && <Alert variant="warning">{adminWarning}</Alert>}

              <h2 className="h6 fw-bold mb-3">Organization Information</h2>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="orgName">
                    <Form.Label>Organization Name *</Form.Label>
                    <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greenfield University" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="orgCode">
                    <Form.Label>Organization Code</Form.Label>
                    <Form.Control disabled placeholder="e.g. GFU2026" />
                    <Form.Text className="text-muted">Not saved yet - no backend field exists.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="orgSlug">
                    <Form.Label>Subdomain *</Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="greenfield" />
                      <span className="text-muted text-nowrap">.examvault.com</span>
                    </div>
                    <Form.Text className="text-muted">This will be used for tenant access.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="orgType">
                    <Form.Label>Organization Type</Form.Label>
                    <Form.Select disabled>
                      <option>Select type</option>
                    </Form.Select>
                    <Form.Text className="text-muted">Not saved yet - no backend field exists.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="orgPlan">
                    <Form.Label>Plan</Form.Label>
                    <Form.Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                      <option value="">Full Access (default)</option>
                      {plans?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">Determines which Admin console modules this organization can use.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <h2 className="h6 fw-bold mb-3 mt-4">Admin Information</h2>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="adminFullName">
                    <Form.Label>Admin Full Name</Form.Label>
                    <Form.Control
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Dr. Emily Carter"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="adminEmail">
                    <Form.Label>Admin Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@greenfield.edu"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="adminPhone">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control disabled placeholder="+1 202-555-0198" />
                    <Form.Text className="text-muted">Not saved yet - no backend field exists.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="adminDesignation">
                    <Form.Label>Designation</Form.Label>
                    <Form.Control disabled placeholder="System Administrator" />
                    <Form.Text className="text-muted">Not saved yet - no backend field exists.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <p className="text-muted small">
                Leave Admin Full Name/Email blank to create the organization only - you can add an admin later.
              </p>

              <h2 className="h6 fw-bold mb-3 mt-4">Address Information</h2>
              <div className="text-muted small border rounded-3 p-3 mb-3">
                Address fields aren't connected yet - no backend field exists on the organization record.
              </div>

              <h2 className="h6 fw-bold mb-3 mt-4">Additional Settings</h2>
              <div className="text-muted small border rounded-3 p-3 mb-4">
                Send-invitation-email, self-registration, and SSO settings aren't connected yet. Today, an invite
                email is always sent automatically when an admin is added.
              </div>

              <div className="d-flex gap-2">
                <Link to="/platform/organizations" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button
                  variant="primary"
                  disabled={!name.trim() || !slug.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? 'Creating...' : '+ Create Organization'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Active Organizations</h2>
              {activeOrgs.length === 0 && <div className="text-muted small py-3 text-center">No active organizations.</div>}
              <div className="d-flex flex-column gap-2">
                {activeOrgs.map((tenant) => (
                  <div key={tenant.id} className="d-flex align-items-center gap-2">
                    <OrgAvatar name={tenant.name} size={28} />
                    <div className="small text-truncate">{tenant.name}</div>
                  </div>
                ))}
              </div>
              <Link to="/platform/organizations/active" className="small text-decoration-none d-inline-block mt-2">
                View all active &rarr;
              </Link>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Trial Organizations</h2>
              <div className="text-center text-muted small py-4">Not connected yet.</div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Suspended Organizations</h2>
              {suspendedOrgs.length === 0 && <div className="text-muted small py-3 text-center">No suspended organizations.</div>}
              <div className="d-flex flex-column gap-2">
                {suspendedOrgs.map((tenant) => (
                  <div key={tenant.id} className="d-flex align-items-center gap-2">
                    <OrgAvatar name={tenant.name} size={28} />
                    <div className="small text-truncate">{tenant.name}</div>
                  </div>
                ))}
              </div>
              <Link to="/platform/organizations/suspended" className="small text-decoration-none d-inline-block mt-2">
                View all suspended &rarr;
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {createMutation.isPending && (
        <div className="position-fixed top-50 start-50 translate-middle">
          <Spinner animation="border" />
        </div>
      )}
    </PlatformLayout>
  );
}
