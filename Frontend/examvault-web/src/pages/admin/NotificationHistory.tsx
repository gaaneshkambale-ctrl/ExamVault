import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import TablePagination from '../../components/reports/TablePagination';
import { useNotificationHistory, useNotificationHistoryStats } from '../../hooks/useNotifications';
import { deleteNotificationBatch, resendNotificationBatch } from '../../api/notificationApi';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { ViewIcon, SendIcon, RemoveIcon } from '../../components/icons/ActionIcons';
import { CheckCircleIcon, AlertTriangleIcon, FlagIcon } from '../../components/reports/ReportIcons';
import { NOTIFICATION_TYPES } from '../../types/notification';
import type {
  NotificationBatchSummaryResponse,
  NotificationChannelFilter,
  NotificationHistoryStatus,
  NotificationType,
} from '../../types/notification';

const PAGE_SIZE = 10;

const CHANNEL_OPTIONS: { value: NotificationChannelFilter; label: string }[] = [
  { value: 'InAppEmail', label: 'In-App + Email' },
  { value: 'InApp', label: 'In-App Only' },
  { value: 'Email', label: 'Email Only' },
];

const STATUS_OPTIONS: NotificationHistoryStatus[] = ['Delivered', 'Failed', 'Scheduled'];

function statusBadgeVariant(status: NotificationHistoryStatus): string {
  if (status === 'Failed') return 'danger';
  if (status === 'Scheduled') return 'info';
  return 'success';
}

export default function NotificationHistory() {
  const [type, setType] = useState<NotificationType | 'All'>('All');
  const [channel, setChannel] = useState<NotificationChannelFilter | 'All'>('All');
  const [status, setStatus] = useState<NotificationHistoryStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<NotificationBatchSummaryResponse | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useNotificationHistory(
    type === 'All' ? undefined : type,
    page,
    PAGE_SIZE,
    search,
    channel === 'All' ? undefined : channel,
    status === 'All' ? undefined : status,
  );
  const { data: stats } = useNotificationHistoryStats();

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const invalidateHistory = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications', 'admin', 'history'] });

  const resendMutation = useMutation({
    mutationFn: (batchId: string) => resendNotificationBatch(batchId),
    onSuccess: invalidateHistory,
  });

  const cancelMutation = useMutation({
    mutationFn: (batchId: string) => deleteNotificationBatch(batchId),
    onSuccess: () => {
      invalidateHistory();
      setCancelTarget(null);
    },
  });

  const resetPage = () => setPage(1);

  return (
    <AdminLayout active="History">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Notification History</h1>
          <p className="text-muted mb-0">Every notification sent, system-triggered or admin-authored.</p>
        </div>
        <Link to="/admin/notifications/create" className="btn btn-primary">
          + Create Notification
        </Link>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<SendIcon size={16} />}
            label="Sent Today"
            value={String(stats?.sentToday ?? 0)}
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Delivered"
            value={String(stats?.delivered ?? 0)}
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<AlertTriangleIcon />}
            label="Failed"
            value={String(stats?.failed ?? 0)}
            iconBg="#fef2f2"
            iconColor="#dc2626"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<FlagIcon />}
            label="Scheduled"
            value={String(stats?.scheduled ?? 0)}
            iconBg="#eff6ff"
            iconColor="#2563eb"
          />
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={4}>
          <Form.Control
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as NotificationType | 'All');
              resetPage();
            }}
          >
            <option value="All">All Types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as NotificationChannelFilter | 'All');
              resetPage();
            }}
          >
            <option value="All">All Channels</option>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as NotificationHistoryStatus | 'All');
              resetPage();
            }}
          >
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || items.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load notification history. Please try again.</div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">No notifications match these filters.</div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Notification</th>
                  <th>Type</th>
                  <th>Recipients</th>
                  <th>Channels</th>
                  <th>Sent / Scheduled</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((batch) => {
                  const isScheduled = batch.status === 'Scheduled';
                  return (
                    <tr key={batch.batchId}>
                      <td className="ps-4 fw-medium">{batch.title}</td>
                      <td>
                        <NotificationTypeBadge type={batch.type} />
                      </td>
                      <td>{batch.recipientCount}</td>
                      <td>{batch.channels}</td>
                      <td>
                        {new Date(isScheduled && batch.scheduledAtUtc ? batch.scheduledAtUtc : batch.sentAtUtc).toLocaleString()}
                      </td>
                      <td>
                        <Badge bg={statusBadgeVariant(batch.status)}>
                          {batch.status === 'Failed' ? `Failed ${batch.failed}` : batch.status}
                        </Badge>
                      </td>
                      <td className="pe-4">
                        <div className="d-flex gap-1">
                          <Link
                            to={`/admin/notifications/history/${batch.batchId}`}
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View"
                            aria-label={`View ${batch.title}`}
                          >
                            <ViewIcon />
                          </Link>
                          {batch.failed > 0 && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              style={{ width: 32, height: 32 }}
                              className="d-inline-flex align-items-center justify-content-center"
                              title="Retry"
                              aria-label={`Retry ${batch.title}`}
                              disabled={resendMutation.isPending}
                              onClick={() => resendMutation.mutate(batch.batchId)}
                            >
                              <SendIcon />
                            </Button>
                          )}
                          {isScheduled && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              style={{ width: 32, height: 32 }}
                              className="d-inline-flex align-items-center justify-content-center"
                              title="Cancel"
                              aria-label={`Cancel ${batch.title}`}
                              onClick={() => setCancelTarget(batch)}
                            >
                              <RemoveIcon />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <TablePagination
        page={page}
        totalPages={totalPages}
        rangeStart={totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
        rangeEnd={Math.min(page * PAGE_SIZE, totalCount)}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      <Modal show={!!cancelTarget} onHide={() => setCancelTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Scheduled Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to cancel "{cancelTarget?.title}"? It will not be sent to its {cancelTarget?.recipientCount}{' '}
          recipient(s).
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCancelTarget(null)}>
            Keep Scheduled
          </Button>
          <Button
            variant="danger"
            disabled={cancelMutation.isPending}
            onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.batchId)}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Notification'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
