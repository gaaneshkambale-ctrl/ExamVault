import { useMemo, useState } from 'react';
import { Badge, Button, Card, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import TablePagination from '../../components/reports/TablePagination';
import ReportStatCard from '../../components/reports/ReportStatCard';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { ViewIcon, SendIcon } from '../../components/icons/ActionIcons';
import { BookIcon, CheckCircleIcon, FlagIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { getNotificationHistory } from '../../api/notificationApi';
import { listAllUsers } from '../../api/userApi';

// Matches notifications.png's Platform Announcement screen. Notification
// History/Templates already existed for a tenant Admin (NotificationsController's
// admin/history + admin/templates endpoints), just Admin-gated - widened to
// Admin,SuperAdmin (see ExamVault Super Admin Menu.txt), so this compact
// recent-activity table is real cross-tenant data. "+ New Announcement" stays
// disabled: CreateNotificationCommand always resolves recipients from the
// caller's own tenant, and the Super Admin's own "Platform" tenant has no
// real users to reach - wiring it up would silently create rows nobody in
// any actual organization ever sees. "Drafts" has no backing concept either
// (a batch is always either sent now or scheduled, never a third "draft"
// state) - shown as "-". "Audience" from the mockup is replaced with
// "Organization" (the real tenant a batch's recipients belong to), since no
// audience label is stored per batch.
const PAGE_SIZE = 5;

export default function PlatformAnnouncement() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['platform-notification-history-all'],
    queryFn: () => getNotificationHistory(undefined, 1, 1000),
  });
  const { data: tenants } = useTenants();
  const { data: users } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const [page, setPage] = useState(1);

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

  const allBatches = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const sentCount = allBatches.filter((b) => b.status === 'Delivered').length;
  const scheduledCount = allBatches.filter((b) => b.status === 'Scheduled').length;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageItems = allBatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PlatformLayout active="notif-announcement">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Notifications / Platform Announcement</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Platform Announcement</h1>
          <p className="text-muted mb-0">Create and send announcements to organizations and users.</p>
        </div>
        <Button variant="primary" disabled title="Not connected yet - would need a new cross-tenant send capability">
          + New Announcement
        </Button>
      </div>

      <div className="border rounded-3 bg-body p-3 mb-3 text-muted small">
        This table shows real announcement history across every organization. "New Announcement" is disabled - sending
        to every organization at once isn't supported by the backend yet (today's send action only reaches one
        organization's own users).
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3">
          <ReportStatCard icon={<BookIcon />} label="Total Announcements" value={String(totalCount)} iconBg="#ede9fe" iconColor="#7c3aed" />
        </div>
        <div className="col-6 col-lg-3">
          <ReportStatCard icon={<CheckCircleIcon />} label="Sent" value={String(sentCount)} iconBg="#dcfce7" iconColor="#16a34a" />
        </div>
        <div className="col-6 col-lg-3">
          <ReportStatCard icon={<FlagIcon />} label="Scheduled" value={String(scheduledCount)} iconBg="#dbeafe" iconColor="#2563eb" />
        </div>
        <div className="col-6 col-lg-3">
          <ReportStatCard icon={<SendIcon />} label="Drafts" value="—" iconBg="#f3f4f6" iconColor="#6b7280" />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || pageItems.length === 0 ? '' : 'p-0'}>
          {isLoading && <div className="text-center text-muted py-5">Loading…</div>}
          {isError && <div className="text-center text-danger py-5">Couldn't load announcements. Please try again.</div>}
          {!isLoading && !isError && pageItems.length === 0 && (
            <div className="text-center text-muted py-5">No announcements yet.</div>
          )}

          {!isLoading && !isError && pageItems.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Announcement</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Sent / Scheduled On</th>
                  <th>Sent By</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((batch) => (
                  <tr key={batch.batchId}>
                    <td className="ps-4 fw-medium">{batch.title}</td>
                    <td>
                      <NotificationTypeBadge type={batch.type} />
                    </td>
                    <td className="text-muted">{tenantNameById.get(batch.tenantId) ?? '—'}</td>
                    <td>
                      <Badge bg={batch.status === 'Failed' ? 'danger' : batch.status === 'Scheduled' ? 'info' : 'success'}>
                        {batch.status}
                      </Badge>
                    </td>
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
