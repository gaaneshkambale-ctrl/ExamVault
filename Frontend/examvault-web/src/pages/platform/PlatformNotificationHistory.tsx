import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import TablePagination from '../../components/reports/TablePagination';
import ReportStatCard from '../../components/reports/ReportStatCard';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { ViewIcon, SendIcon } from '../../components/icons/ActionIcons';
import { CheckCircleIcon, AlertTriangleIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { useNotificationHistory, useNotificationHistoryStats } from '../../hooks/useNotifications';
import { listAllUsers } from '../../api/userApi';
import { NOTIFICATION_TYPES } from '../../types/notification';
import type { NotificationChannelFilter, NotificationHistoryStatus, NotificationType } from '../../types/notification';

// Matches notifications.png's Notification History screen. Real, reusing
// the same widened admin/history + admin/history/stats endpoints as
// Platform Announcement. Stat cards (Total Sent/Delivered/Failed/Pending)
// come from GetNotificationHistoryStats, extended with two new fields
// (Total, Pending) alongside its existing SentToday/Delivered/Failed/
// Scheduled - a small additive backend change, same shape as every other
// response-widening this session. "Audience" from the mockup is replaced
// with "Organization" (the real tenant each batch's recipients belong to).
// Actions column stays a disabled "View" icon - no batch-details drill-down
// page exists for the Super Admin console (Resend/Cancel role gates were
// widened on the backend but aren't wired into this UI, since no mockup
// shows what that flow should look like here).
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

export default function PlatformNotificationHistory() {
  const [type, setType] = useState<NotificationType | 'All'>('All');
  const [channel, setChannel] = useState<NotificationChannelFilter | 'All'>('All');
  const [status, setStatus] = useState<NotificationHistoryStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useNotificationHistory(
    type === 'All' ? undefined : type,
    page,
    PAGE_SIZE,
    search,
    channel === 'All' ? undefined : channel,
    status === 'All' ? undefined : status,
  );
  const { data: stats } = useNotificationHistoryStats();
  const { data: tenants } = useTenants();
  const { data: users } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const adminNameById = useMemo(() => {
    const map = new Map<string, string>();
    (users ?? []).forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [users]);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetPage = () => setPage(1);

  return (
    <PlatformLayout active="notif-history">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Notifications / Notification History</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Notification History</h1>
          <p className="text-muted mb-0">View sent notifications and delivery status, across every organization.</p>
        </div>
        <Button variant="outline-secondary" disabled title="Not connected yet">
          Export
        </Button>
      </div>

      <Row className="g-3 mb-3">
        <Col md={6} lg={3}>
          <ReportStatCard icon={<SendIcon size={16} />} label="Total Sent" value={String(stats?.total ?? 0)} iconBg="#eef2ff" iconColor="#4f46e5" />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard icon={<CheckCircleIcon />} label="Delivered" value={String(stats?.delivered ?? 0)} iconBg="#ecfdf5" iconColor="#059669" />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard icon={<AlertTriangleIcon />} label="Failed" value={String(stats?.failed ?? 0)} iconBg="#fef2f2" iconColor="#dc2626" />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard icon={<SendIcon size={16} />} label="Pending" value={String(stats?.pending ?? 0)} iconBg="#fff7ed" iconColor="#d97706" />
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

          {isError && <div className="text-center text-danger py-5">Couldn't load notification history. Please try again.</div>}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">No notifications match these filters.</div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Title</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th>Sent On</th>
                  <th>Sent By</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((batch) => (
                  <tr key={batch.batchId}>
                    <td className="ps-4 fw-medium">{batch.title}</td>
                    <td>
                      <NotificationTypeBadge type={batch.type} />
                    </td>
                    <td className="text-muted">{tenantNameById.get(batch.tenantId) ?? '—'}</td>
                    <td>
                      <Badge bg={statusBadgeVariant(batch.status)}>
                        {batch.status === 'Failed' ? `Failed ${batch.failed}` : batch.status}
                      </Badge>
                    </td>
                    <td className="text-muted">{batch.channels}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {new Date(batch.status === 'Scheduled' && batch.scheduledAtUtc ? batch.scheduledAtUtc : batch.sentAtUtc).toLocaleString()}
                    </td>
                    <td className="text-muted">
                      {batch.createdByAdminUserId ? adminNameById.get(batch.createdByAdminUserId) ?? '—' : 'System'}
                    </td>
                    <td className="pe-4">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled
                        title="Not connected yet"
                        style={{ width: 32, height: 32 }}
                        className="d-inline-flex align-items-center justify-content-center"
                      >
                        <ViewIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
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
    </PlatformLayout>
  );
}
