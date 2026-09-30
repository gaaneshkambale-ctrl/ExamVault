import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import OrgAvatar from '../../components/OrgAvatar';
import { useTenants } from '../../hooks/useTenants';
import { createTenant, createTenantAdmin } from '../../api/tenantsApi';
import { listPlans } from '../../api/plansApi';
import { listOrganizationTypes } from '../../api/organizationTypesApi';
import { extractServerError } from '../../utils/apiError';
import { isValidEmail } from '../../utils/email';

// Mirrors CreateTenantValidator.cs (Name/Slug/OrganizationType required,
// Slug DNS-label-safe and not a reserved word, TrialEndsAtUtc required when
// IsTrial) and CreateTenantAdminValidator.cs (FullName/Email required
// together, PhoneNumber format) - kept in sync by hand since there's no
// shared validation layer between the two apps.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
// Must match CreateTenantValidator.cs's own ReservedSlugs exactly.
const RESERVED_SLUGS = ['platform', 'api', 'www'];

type FieldKey =
  | 'name'
  | 'slug'
  | 'orgType'
  | 'trialEndDate'
  | 'adminFullName'
  | 'adminEmail'
  | 'adminPhoneNumber'
  | 'adminDesignation';

// Matches org_submenu.png's Create Organization page. Real fields: Name,
// Subdomain, Organization Type, Address, and Admin Full Name/Email/Phone
// Number/Designation. Admin Information is mandatory on this form (see
// validate()'s own comment) - every organization created here always gets
// a second real API call (createTenantAdmin) right after the tenant is
// created, so creating an org and its first admin is genuinely one step,
// never a "create org only, add an admin later" partial state. Organization
// Code is no longer a manual field - the backend generates a unique one automatically
// on creation (CreateTenantHandler -> OrganizationCodeGenerator), visible
// afterward on the org's Details page. The mockup's 3 toggles still have no
// backing field anywhere in this codebase - shown disabled with a "not
// saved yet" hint rather than silently accepting and discarding input.
export default function CreateOrganization() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants } = useTenants();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });
  const { data: organizationTypes } = useQuery({ queryKey: ['organization-types'], queryFn: listOrganizationTypes });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgType, setOrgType] = useState('');
  const [planId, setPlanId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('');
  const [adminWarning, setAdminWarning] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const createMutation = useMutation({
    mutationFn: async () => {
      const tenant = await createTenant({
        name,
        slug,
        planId: planId || undefined,
        isTrial,
        trialEndsAtUtc: isTrial && trialEndDate ? new Date(trialEndDate).toISOString() : undefined,
        organizationType: orgType || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || undefined,
      });
      // Admin fields are always filled by the time validate() lets this
      // run, but the tenant is already durably created above - a failure
      // here (eg. a race against another Admin creating the same email)
      // must surface as a warning on an already-created org, not silently
      // fail the whole submission or retry tenant creation.
      let adminError: string | null = null;
      try {
        await createTenantAdmin(tenant.id, {
          fullName: adminFullName,
          email: adminEmail,
          phoneNumber: adminPhoneNumber.trim(),
          designation: adminDesignation.trim(),
        });
      } catch (error) {
        adminError = `${tenant.name} was created, but the admin account couldn't be added: ${extractServerError(error)}`;
      }
      return { tenant, adminError };
    },
    onSuccess: ({ tenant, adminError }) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      if (adminError) {
        // Stay on this page instead of navigating away - the org was
        // created but its admin wasn't, and the user needs to actually
        // see why (previously this warning was set right before an
        // immediate navigate(), so it was set but never rendered).
        setAdminWarning(adminError);
      } else {
        navigate(`/platform/organizations/${tenant.id}`);
      }
    },
  });

  // Runs on submit attempt (not per-keystroke) - matches this app's own
  // pattern elsewhere (CreateExam.tsx, OrganizationSettings.tsx): let the
  // Admin click Create, show exactly what's wrong inline, rather than a
  // silently-disabled button that never explains why.
  //
  // Admin Information is mandatory on THIS form (explicit choice - every
  // organization created here gets a real first Admin immediately, no
  // "create org only" path). That's deliberately scoped to just this
  // page's own client-side validation, not the shared backend
  // CreateTenantAdminValidator.cs/CreateTenantAdminCommand - that endpoint
  // is also used by OrganizationDetails.tsx's own separate "Add Admin"
  // dialog for an org that already exists, which only ever collects Full
  // Name/Email (no Phone/Designation) - making Phone/Designation
  // universally required there would break that real, working flow.
  const validate = (): Partial<Record<FieldKey, string>> => {
    const errors: Partial<Record<FieldKey, string>> = {};

    if (!name.trim()) {
      errors.name = 'Organization Name is required.';
    }

    if (!slug.trim()) {
      errors.slug = 'Subdomain is required.';
    } else if (!SLUG_PATTERN.test(slug.trim())) {
      errors.slug = 'Lowercase letters, numbers, and hyphens only (e.g. "stanford").';
    } else if (RESERVED_SLUGS.includes(slug.trim().toLowerCase())) {
      errors.slug = 'This subdomain is reserved and can\'t be used.';
    }

    if (!orgType) {
      errors.orgType = 'Organization Type is required.';
    }

    if (isTrial && !trialEndDate) {
      errors.trialEndDate = 'Trial end date is required.';
    }

    if (!adminFullName.trim()) {
      errors.adminFullName = 'Admin Full Name is required.';
    }

    if (!adminEmail.trim()) {
      errors.adminEmail = 'Admin Email is required.';
    } else if (!isValidEmail(adminEmail)) {
      errors.adminEmail = 'Enter a valid email address.';
    }

    if (!adminPhoneNumber.trim()) {
      errors.adminPhoneNumber = 'Phone Number is required.';
    } else if (!PHONE_PATTERN.test(adminPhoneNumber.trim())) {
      errors.adminPhoneNumber = 'Enter a valid phone number.';
    }

    if (!adminDesignation.trim()) {
      errors.adminDesignation = 'Designation is required.';
    }

    return errors;
  };

  const clearFieldErrors = (...fields: FieldKey[]) => {
    setFieldErrors((prev) => {
      if (!fields.some((field) => prev[field])) return prev;
      const next = { ...prev };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  };

  const handleCreate = () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    createMutation.mutate();
  };

  const activeOrgs = (tenants ?? []).filter((t) => t.isActive).slice(0, 5);
  const suspendedOrgs = (tenants ?? []).filter((t) => !t.isActive).slice(0, 5);
  const trialOrgs = (tenants ?? []).filter((t) => t.isTrial).slice(0, 5);
  const minTrialDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
                    <Form.Label>
                      Organization Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldErrors('name');
                      }}
                      placeholder="e.g. Greenfield University"
                      isInvalid={!!fieldErrors.name}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      A unique Organization Code will be generated automatically from this name.
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="orgSlug">
                    <Form.Label>
                      Subdomain <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value);
                          clearFieldErrors('slug');
                        }}
                        placeholder="greenfield"
                        isInvalid={!!fieldErrors.slug}
                      />
                      <span className="text-muted text-nowrap">.examvaults.in</span>
                    </div>
                    {fieldErrors.slug ? (
                      <div className="invalid-feedback d-block">{fieldErrors.slug}</div>
                    ) : (
                      <Form.Text className="text-muted">This will be used for tenant access.</Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="orgType">
                    <Form.Label>
                      Organization Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      value={orgType}
                      onChange={(e) => {
                        setOrgType(e.target.value);
                        clearFieldErrors('orgType');
                      }}
                      isInvalid={!!fieldErrors.orgType}
                    >
                      <option value="">Select type</option>
                      {(organizationTypes ?? []).map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{fieldErrors.orgType}</Form.Control.Feedback>
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
                <Col md={6}>
                  <Form.Group controlId="orgTrial">
                    <Form.Label className="d-block">Trial</Form.Label>
                    <Form.Check
                      type="checkbox"
                      id="orgIsTrial"
                      label="Mark as trial organization"
                      checked={isTrial}
                      onChange={(e) => setIsTrial(e.target.checked)}
                    />
                    {isTrial && (
                      <>
                        <Form.Label className="d-block mt-2 mb-1 small">
                          Trial End Date <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          min={minTrialDate}
                          value={trialEndDate}
                          onChange={(e) => {
                            setTrialEndDate(e.target.value);
                            clearFieldErrors('trialEndDate');
                          }}
                          isInvalid={!!fieldErrors.trialEndDate}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.trialEndDate}</Form.Control.Feedback>
                      </>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <h2 className="h6 fw-bold mb-3 mt-4">Admin Information</h2>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="adminFullName">
                    <Form.Label>
                      Admin Full Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      value={adminFullName}
                      onChange={(e) => {
                        setAdminFullName(e.target.value);
                        clearFieldErrors('adminFullName');
                      }}
                      placeholder="e.g. Dr. Emily Carter"
                      isInvalid={!!fieldErrors.adminFullName}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.adminFullName}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="adminEmail">
                    <Form.Label>
                      Admin Email <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        clearFieldErrors('adminEmail');
                      }}
                      placeholder="admin@greenfield.edu"
                      isInvalid={!!fieldErrors.adminEmail}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.adminEmail}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="adminPhone">
                    <Form.Label>
                      Phone Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      value={adminPhoneNumber}
                      onChange={(e) => {
                        setAdminPhoneNumber(e.target.value);
                        clearFieldErrors('adminPhoneNumber');
                      }}
                      placeholder="+91 98765 43210"
                      isInvalid={!!fieldErrors.adminPhoneNumber}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.adminPhoneNumber}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="adminDesignation">
                    <Form.Label>
                      Designation <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      value={adminDesignation}
                      onChange={(e) => {
                        setAdminDesignation(e.target.value);
                        clearFieldErrors('adminDesignation');
                      }}
                      placeholder="System Administrator"
                      isInvalid={!!fieldErrors.adminDesignation}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.adminDesignation}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              <h2 className="h6 fw-bold mb-3 mt-4">Address Information</h2>
              <Row className="g-3 mb-2">
                <Col md={6}>
                  <Form.Group controlId="orgAddressLine1">
                    <Form.Label>Address Line 1</Form.Label>
                    <Form.Control value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="orgAddressLine2">
                    <Form.Label>Address Line 2 (optional)</Form.Label>
                    <Form.Control value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apartment, suite, etc." />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="g-3 mb-3">
                <Col md={3}>
                  <Form.Group controlId="orgCity">
                    <Form.Label>City</Form.Label>
                    <Form.Control value={city} onChange={(e) => setCity(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="orgState">
                    <Form.Label>State</Form.Label>
                    <Form.Control value={state} onChange={(e) => setState(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="orgPostalCode">
                    <Form.Label>Postal Code</Form.Label>
                    <Form.Control value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="orgCountry">
                    <Form.Label>Country</Form.Label>
                    <Form.Control value={country} onChange={(e) => setCountry(e.target.value)} />
                  </Form.Group>
                </Col>
              </Row>

              <h2 className="h6 fw-bold mb-3 mt-4">Additional Settings</h2>
              <div className="text-muted small border rounded-3 p-3 mb-4">
                Send-invitation-email, self-registration, and SSO settings aren't connected yet. Today, an invite
                email is always sent automatically when an admin is added.
              </div>

              <div className="d-flex gap-2">
                <Link to="/platform/organizations" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button variant="primary" disabled={createMutation.isPending} onClick={handleCreate}>
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
              {trialOrgs.length === 0 && <div className="text-muted small py-3 text-center">No trial organizations.</div>}
              <div className="d-flex flex-column gap-2">
                {trialOrgs.map((tenant) => (
                  <div key={tenant.id} className="d-flex align-items-center gap-2">
                    <OrgAvatar name={tenant.name} size={28} />
                    <div className="small text-truncate">{tenant.name}</div>
                  </div>
                ))}
              </div>
              <Link to="/platform/organizations/trial" className="small text-decoration-none d-inline-block mt-2">
                View all trial &rarr;
              </Link>
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
