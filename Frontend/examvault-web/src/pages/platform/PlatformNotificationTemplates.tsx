import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useNotificationTemplates } from '../../hooks/useNotifications';
import {
  createNotificationTemplate,
  duplicateNotificationTemplate,
  updateNotificationTemplate,
} from '../../api/notificationApi';
import { ViewIcon, EditIcon, CopyIcon } from '../../components/icons/ActionIcons';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { PLATFORM_NOTIFICATION_TYPES } from '../../types/notification';
import type { NotificationTemplateResponse, NotificationType } from '../../types/notification';
import { extractServerError } from '../../utils/apiError';

// Matches notifications.png's Templates screen. Real, full CRUD - the
// backend's admin/templates endpoints already existed for a tenant Admin,
// just Admin-gated (widened to Admin,SuperAdmin). A template a Super Admin
// creates gets stamped with their own reserved "Platform" tenant ID (same
// TenantScopedDbContext stamping every other tenant-scoped entity uses),
// so this is genuinely the Super Admin's own template library, not
// borrowed/faked data. Two new NotificationType values (Announcement/
// Alert) were added for this page specifically - a tenant Admin's own
// Notification Templates page still only ever offers the original five
// (see PLATFORM_NOTIFICATION_TYPES vs NOTIFICATION_TYPES in types/
// notification.ts). "Audience" from the mockup is dropped - no such field
// exists on a template.
const TABS: { key: NotificationType | 'All'; label: string }[] = [
  { key: 'All', label: 'All Templates' },
  { key: 'Announcement', label: 'Announcement' },
  { key: 'Alert', label: 'Alert' },
  { key: 'System', label: 'System' },
  { key: 'Reminder', label: 'Reminder' },
];

const DELIVERY_CHANNELS = [
  { value: 'both', label: 'In-App + Email', sendEmail: true, sendInApp: true },
  { value: 'inapp', label: 'In-App Only', sendEmail: false, sendInApp: true },
  { value: 'email', label: 'Email Only', sendEmail: true, sendInApp: false },
] as const;

function channelValueFor(sendEmail: boolean, sendInApp: boolean): (typeof DELIVERY_CHANNELS)[number]['value'] {
  if (sendEmail && sendInApp) return 'both';
  if (sendInApp) return 'inapp';
  return 'email';
}

interface TemplateFormState {
  name: string;
  type: NotificationType;
  channel: (typeof DELIVERY_CHANNELS)[number]['value'];
  subject: string;
  body: string;
  isActive: boolean;
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  type: 'Announcement',
  channel: 'both',
  subject: '',
  body: '',
  isActive: true,
};

export default function PlatformNotificationTemplates() {
  const [tab, setTab] = useState<NotificationType | 'All'>('All');
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplateResponse | null>(null);

  const queryClient = useQueryClient();
  const { data: templates, isLoading, isError } = useNotificationTemplates(
    search,
    tab === 'All' ? undefined : tab,
    undefined,
    undefined,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications', 'admin', 'templates'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const selected = DELIVERY_CHANNELS.find((c) => c.value === form.channel) ?? DELIVERY_CHANNELS[0];
      const payload = {
        name: form.name,
        type: form.type,
        sendEmail: selected.sendEmail,
        sendInApp: selected.sendInApp,
        subject: form.subject,
        body: form.body,
        isActive: form.isActive,
      };
      return editingId ? updateNotificationTemplate(editingId, payload) : createNotificationTemplate(payload);
    },
    onSuccess: () => {
      invalidate();
      setShowModal(false);
    },
    onError: (error) => setFormError(extractServerError(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateNotificationTemplate(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (t: NotificationTemplateResponse) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      channel: channelValueFor(t.sendEmail, t.sendInApp),
      subject: t.subject,
      body: t.body,
      isActive: t.status === 'Active',
    });
    setFormError('');
    setShowModal(true);
  };

  const items = templates ?? [];

  return (
    <PlatformLayout active="notif-templates">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Notifications / Templates</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Templates</h1>
          <p className="text-muted mb-0">Manage notification templates used for announcements and alerts.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create Template
        </Button>
      </div>

      <div className="d-flex gap-2 flex-wrap mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}>
              <Form.Control placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </Col>
          </Row>

          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load templates. Please try again.</div>}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">No templates match these filters.</div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th>Template Name</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-medium">{t.name}</td>
                      <td>
                        <NotificationTypeBadge type={t.type} />
                      </td>
                      <td className="text-muted" style={{ maxWidth: 260 }}>
                        <div className="text-truncate">{t.subject}</div>
                      </td>
                      <td>{new Date(t.updatedAtUtc).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <Badge bg={t.status === 'Active' ? 'success' : 'secondary'}>{t.status}</Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ width: 32, height: 32 }}
                            className="d-inline-flex align-items-center justify-content-center"
                            title="Preview"
                            aria-label={`Preview ${t.name}`}
                            onClick={() => setPreviewTemplate(t)}
                          >
                            <ViewIcon />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ width: 32, height: 32 }}
                            className="d-inline-flex align-items-center justify-content-center"
                            title="Duplicate"
                            aria-label={`Duplicate ${t.name}`}
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate(t.id)}
                          >
                            <CopyIcon />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ width: 32, height: 32 }}
                            className="d-inline-flex align-items-center justify-content-center"
                            title="Edit"
                            aria-label={`Edit ${t.name}`}
                            onClick={() => openEdit(t)}
                          >
                            <EditIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Template' : 'Create Template'}</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <Modal.Body>
            {formError && <div className="text-danger small mb-3">{formError}</div>}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Template Name *</Form.Label>
                  <Form.Control
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={200}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Type *</Form.Label>
                  <Form.Select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NotificationType }))}
                  >
                    {PLATFORM_NOTIFICATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Channels</Form.Label>
                  <Form.Select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as TemplateFormState['channel'] }))}
                  >
                    {DELIVERY_CHANNELS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Subject *</Form.Label>
              <Form.Control
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                maxLength={300}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Body *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                maxLength={2000}
                required
              />
            </Form.Group>

            <Form.Check
              type="switch"
              id="platform-template-active"
              label={form.isActive ? 'Active' : 'Draft'}
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!previewTemplate} onHide={() => setPreviewTemplate(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Preview: {previewTemplate?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="fw-bold mb-2">{previewTemplate?.subject}</div>
          <div className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>
            {previewTemplate?.body}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setPreviewTemplate(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
