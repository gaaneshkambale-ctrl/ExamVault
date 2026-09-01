import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { useNotificationTemplates } from '../../hooks/useNotifications';
import {
  createNotificationTemplate,
  duplicateNotificationTemplate,
  updateNotificationTemplate,
} from '../../api/notificationApi';
import { ViewIcon, EditIcon, CopyIcon } from '../../components/icons/ActionIcons';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { NOTIFICATION_TYPES } from '../../types/notification';
import type { NotificationChannelFilter, NotificationTemplateResponse, NotificationType } from '../../types/notification';
import { extractServerError } from '../../utils/apiError';

const CHANNEL_OPTIONS: { value: NotificationChannelFilter; label: string }[] = [
  { value: 'InAppEmail', label: 'In-App + Email' },
  { value: 'InApp', label: 'In-App Only' },
  { value: 'Email', label: 'Email Only' },
];

function TemplateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

const RECOMMENDED_VARIABLES = ['{{studentName}}', '{{examName}}', '{{startDate}}', '{{endDate}}', '{{duration}}', '{{resultUrl}}'];

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
  type: 'Exam',
  channel: 'both',
  subject: '',
  body: '',
  isActive: true,
};

export default function NotificationTemplates() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<NotificationType | 'All'>('All');
  const [channel, setChannel] = useState<NotificationChannelFilter | 'All'>('All');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplateResponse | null>(null);

  const queryClient = useQueryClient();
  const { data: templates, isLoading, isError } = useNotificationTemplates(
    search,
    type === 'All' ? undefined : type,
    channel === 'All' ? undefined : channel,
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
    <AdminLayout active="Notification Templates">
      <h1 className="h4 fw-bold mb-1 text-primary">Notification Templates</h1>
      <p className="text-muted mb-4">Create reusable professional templates for common ExamVault events.</p>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <SectionHeader
            icon={<TemplateIcon />}
            title="Notification Templates"
            subtitle="Reusable templates keep email and in-app communication consistent."
            action={
              <Button variant="primary" onClick={openCreate}>
                + Create Template
              </Button>
            }
          />
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Row className="g-2 mb-3">
            <Col md={5}>
              <Form.Control
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select value={type} onChange={(e) => setType(e.target.value as NotificationType | 'All')}>
                <option value="All">All Types</option>
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={channel}
                onChange={(e) => setChannel(e.target.value as NotificationChannelFilter | 'All')}
              >
                <option value="All">All Channels</option>
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load templates. Please try again.</div>
          )}

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
                    <th>Channels</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-medium">{t.name}</td>
                      <td>
                        <NotificationTypeBadge type={t.type} />
                      </td>
                      <td>{t.channels}</td>
                      <td>
                        <Badge bg={t.status === 'Active' ? 'success' : 'secondary'}>{t.status}</Badge>
                      </td>
                      <td>{new Date(t.updatedAtUtc).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
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

          <Card className="border-0 mt-4" style={{ background: '#eef2ff' }}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <BulbIcon />
                <h3 className="h6 fw-bold text-primary mb-0">Recommended Template Variables</h3>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {RECOMMENDED_VARIABLES.map((v) => (
                  <code key={v} className="px-2 py-1 rounded bg-white border small">
                    {v}
                  </code>
                ))}
              </div>
              <p className="text-muted small mb-0">Variables are replaced automatically when the notification is generated.</p>
            </Card.Body>
          </Card>
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
                    {NOTIFICATION_TYPES.map((t) => (
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
              <div className="text-muted small mt-1">
                Variables: {RECOMMENDED_VARIABLES.join(', ')}
              </div>
            </Form.Group>

            <Form.Check
              type="switch"
              id="template-active"
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
    </AdminLayout>
  );
}
