import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { EditIcon, TrashIcon } from '../../components/icons/ActionIcons';
import {
  createOrganizationType,
  deleteOrganizationType,
  listAllOrganizationTypes,
  updateOrganizationType,
} from '../../api/organizationTypesApi';
import { extractServerError } from '../../utils/apiError';
import type { OrganizationType } from '../../types/organizationType';

interface FormState {
  name: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', sortOrder: '0', isActive: true };

// Super Admin management screen for the "Institution Type" dropdown options
// shown on Admin's Organization Settings and on this panel's own Create
// Organization page - previously a hardcoded frontend list
// (types/tenant.ts's ORGANIZATION_TYPES), now a real backend-driven table
// (OrganizationType entity, api/organizationTypesApi.ts) so a new type can
// be added without a code deploy. Deleting or deactivating a type here never
// touches any tenant's already-stored value (Tenant.OrganizationType is
// free text, not a foreign key) - it only changes what appears in the
// dropdown going forward.
export default function OrganizationTypes() {
  const queryClient = useQueryClient();
  const { data: types, isLoading, isError } = useQuery({
    queryKey: ['organization-types-all'],
    queryFn: listAllOrganizationTypes,
  });

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrganizationType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<OrganizationType | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['organization-types-all'] });
    queryClient.invalidateQueries({ queryKey: ['organization-types'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createOrganizationType({ name: form.name.trim(), sortOrder: Number(form.sortOrder) || 0 }),
    onSuccess: () => {
      invalidate();
      setShowModal(false);
    },
    onError: (error) => setFormError(extractServerError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateOrganizationType(editing!.id, {
        name: form.name.trim(),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setShowModal(false);
    },
    onError: (error) => setFormError(extractServerError(error)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (type: OrganizationType) =>
      updateOrganizationType(type.id, { name: type.name, isActive: !type.isActive, sortOrder: type.sortOrder }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganizationType(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: String((types?.length ?? 0)) });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (type: OrganizationType) => {
    setEditing(type);
    setForm({ name: type.name, sortOrder: String(type.sortOrder), isActive: type.isActive });
    setFormError('');
    setShowModal(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const sorted = [...(types ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <PlatformLayout active="org-types">
      <p className="text-muted small mb-1">Platform Admin / Organizations / Organization Types</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Organization Types</h1>
      <p className="text-muted mb-3">
        Manage the "Institution Type" options shown on Organization Settings and Create Organization. Deactivating or
        deleting a type never changes any organization's already-saved value - it only affects the dropdown going forward.
      </p>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Add Type
            </Button>
          </div>

          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load organization types. Please try again.</div>}

          {!isLoading && !isError && (
            <Table responsive hover className="align-middle mb-0">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th>Sort Order</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((type) => (
                  <tr key={type.id}>
                    <td className="text-muted">{type.sortOrder}</td>
                    <td>{type.name}</td>
                    <td>
                      <Form.Check
                        type="switch"
                        checked={type.isActive}
                        onChange={() => toggleActiveMutation.mutate(type)}
                        label={type.isActive ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}
                      />
                    </td>
                    <td className="text-end">
                      <Button variant="link" size="sm" className="text-muted p-1" onClick={() => openEdit(type)} title="Edit">
                        <EditIcon />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-1"
                        onClick={() => setDeleteTarget(type)}
                        title="Delete"
                      >
                        <TrashIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      No organization types yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{editing ? 'Edit Organization Type' : 'Add Organization Type'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && (
            <Alert variant="danger" className="py-2 small">
              {formError}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label className="small">Name</Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Coaching Institute"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small">Sort Order</Form.Label>
            <Form.Control
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            />
            <div className="text-muted small mt-1">Lower numbers appear first in the dropdown.</div>
          </Form.Group>
          {editing && (
            <Form.Check
              type="switch"
              label="Active (shown in the dropdown)"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Delete Organization Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete "{deleteTarget?.name}"? Organizations that already picked this value keep it as-is - it just stops
          appearing in the dropdown for new selections.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
