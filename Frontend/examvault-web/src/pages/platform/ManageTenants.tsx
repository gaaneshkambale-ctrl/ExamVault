import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import DeactivateTenantButton from '../../components/DeactivateTenantButton';
import { useTenants } from '../../hooks/useTenants';
import { createTenant, createTenantAdmin } from '../../api/tenantsApi';
import { extractServerError } from '../../utils/apiError';
import type { Tenant } from '../../types/tenant';

interface ManageTenantsProps {
  // Undefined = "All Organizations". PlatformSidebar's nav key for
  // highlighting and the create-modal auto-open both derive from this
  // page being mounted at one of four routes (org-all/create/active/
  // suspended) - see AppRoutes.tsx.
  statusFilter?: 'active' | 'suspended';
  autoOpenCreate?: boolean;
}

export default function ManageTenants({ statusFilter, autoOpenCreate = false }: ManageTenantsProps) {
  const { data: tenants, isLoading, isError } = useTenants();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(autoOpenCreate);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [adminTarget, setAdminTarget] = useState<Tenant | null>(null);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createTenant({ name, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowCreate(false);
      setName('');
      setSlug('');
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: () => createTenantAdmin(adminTarget!.id, { fullName: adminFullName, email: adminEmail }),
  });

  const openCreate = () => {
    createMutation.reset();
    setName('');
    setSlug('');
    setShowCreate(true);
  };

  const openAddAdmin = (tenant: Tenant) => {
    createAdminMutation.reset();
    setAdminFullName('');
    setAdminEmail('');
    setAdminTarget(tenant);
  };

  const filteredTenants = tenants?.filter((tenant) => {
    if (statusFilter === 'active') return tenant.isActive;
    if (statusFilter === 'suspended') return !tenant.isActive;
    return true;
  });

  const activeNavKey = autoOpenCreate
    ? 'org-create'
    : statusFilter === 'active'
      ? 'org-active'
      : statusFilter === 'suspended'
        ? 'org-suspended'
        : 'org-all';
  const pageTitle =
    statusFilter === 'active' ? 'Active Organizations' : statusFilter === 'suspended' ? 'Suspended Organizations' : 'Organizations';

  return (
    <PlatformLayout active={activeNavKey}>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Organizations</p>
          <h1 className="h4 fw-bold mb-1 text-primary">{pageTitle}</h1>
          <p className="text-muted mb-0">
            Organizations using ExamVault - manual provisioning path (Super Admin only).
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create Organization
        </Button>
      </div>

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Organization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createMutation.isError && <Alert variant="danger">{extractServerError(createMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="tenantName">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stanford University" />
          </Form.Group>
          <Form.Group controlId="tenantSlug">
            <Form.Label>Slug (subdomain)</Form.Label>
            <Form.Control value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. stanford" />
            <Form.Text className="text-muted">Reached at {slug || '<slug>'}.examvault.com</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !slug.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={adminTarget !== null} onHide={() => setAdminTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Admin to {adminTarget?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createAdminMutation.isError && (
            <Alert variant="danger">{extractServerError(createAdminMutation.error)}</Alert>
          )}
          {createAdminMutation.isSuccess ? (
            <Alert variant="success" className="mb-0">
              Admin created. They can log in at {adminTarget?.slug}.examvault.com once a password is set.
            </Alert>
          ) : (
            <>
              <Form.Group className="mb-3" controlId="tenantAdminFullName">
                <Form.Label>Full Name</Form.Label>
                <Form.Control value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} />
              </Form.Group>
              <Form.Group controlId="tenantAdminEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setAdminTarget(null)}>
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

      <Card className="border-0 shadow-sm mt-3">
        <Card.Body className={isLoading || isError || filteredTenants?.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

          {!isLoading && !isError && filteredTenants?.length === 0 && (
            <div className="text-center text-muted py-5">
              {statusFilter ? `No ${statusFilter} organizations.` : 'No organizations yet. Click "+ Create Organization" to add one.'}
            </div>
          )}

          {!isLoading && !isError && filteredTenants && filteredTenants.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Name</th>
                  <th>Subdomain</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="ps-4 fw-medium">{tenant.name}</td>
                    <td className="text-muted">{tenant.slug}.examvault.com</td>
                    <td>
                      <Badge bg={tenant.isActive ? 'success' : 'secondary'}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4 d-flex gap-2">
                      <Button variant="outline-primary" size="sm" onClick={() => openAddAdmin(tenant)}>
                        Add Admin
                      </Button>
                      {tenant.isActive && <DeactivateTenantButton tenantId={tenant.id} tenantName={tenant.name} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
