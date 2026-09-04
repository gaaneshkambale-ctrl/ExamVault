import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Col, Dropdown, Form, Modal, Pagination, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { getAuditLogs } from '../../api/auditApi';
import { listPlans } from '../../api/plansApi';
import { DownloadIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { timeAgo } from '../../utils/timeAgo';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Real, same data source as Security Events (same query key, dedupes the
// fetch) - AssignPlanToTenantHandler now looks up the tenant's previous
// plan name before overwriting it, and TenantsController.AssignPlan writes
// a Security/"Plan changed" audit entry (Details = "Old -> New") whenever
// the assigned plan actually changes. Re-assigning the same plan writes
// nothing - not a real history event.
//
// Redesigned 2026-09-04 to match subscription-history.png: stat cards,
// a real filter panel (Organization/Plan/Changed By/Date Range), sortable
// columns, CSV export and a row detail modal. RecordSecurityEventAsync
// only ever runs from TenantsController, which is class-level
// [Authorize(Roles = "SuperAdmin")] - so "Changed By" is always a Super
// Admin, and AuditLogResponse.userName is that actor's real email (see
// RecordSecurityEventAsync's own ClaimTypes.Email argument), not a display
// name - both facts this page relies on rather than fabricating.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

interface PlanChange {
  id: string;
  timestampUtc: string;
  tenantId: string;
  fromPlan: string | null;
  toPlan: string | null;
  changedBy: string | null;
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" />
      <line x1="10" y1="22" x2="10" y2="18" /><line x1="14" y1="22" x2="14" y2="18" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function BuildingSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" />
    </svg>
  );
}

function LayersSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" />
    </svg>
  );
}

function UserSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.35, transform: active && direction === 'asc' ? 'rotate(180deg)' : undefined }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <span role="button" onClick={onClick} className="d-inline-flex align-items-center gap-1 text-nowrap" style={{ cursor: 'pointer' }}>
      {label} <SortIcon active={active} direction={direction} />
    </span>
  );
}

function initialsFromEmail(email: string | null): string {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
  return initials.toUpperCase();
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return initials.toUpperCase();
}

function StatCard({ icon, iconBg, iconColor, label, value, sublabel, badge }: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  sublabel?: string;
  badge?: { text: string; variant: 'success' | 'danger' };
}) {
  return (
    <Col xs={12} sm={6} xl={3}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex align-items-start gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">{value}</div>
            {sublabel && <div className="text-muted small">{sublabel}</div>}
            {badge && (
              <span
                className={`d-inline-block mt-1 px-2 py-1 rounded-2 small fw-medium ${badge.variant === 'success' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
              >
                {badge.variant === 'success' ? '↗' : '↘'} {badge.text}
              </span>
            )}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

type SortColumn = 'date' | 'organization' | 'changedBy';

export default function SubscriptionHistory() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs', 'Security'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO, 'Security'),
  });
  const { data: tenants } = useTenants();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: listPlans });

  // Filter panel state - applied only on "Search" (matching the mockup's
  // explicit Search/Clear buttons), not live-as-you-type, so picking a few
  // dropdowns doesn't thrash the table on every click.
  const [pendingOrgId, setPendingOrgId] = useState('');
  const [pendingPlanName, setPendingPlanName] = useState('');
  const [pendingChangedBy, setPendingChangedBy] = useState('');
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');

  const [orgId, setOrgId] = useState('');
  const [planName, setPlanName] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [detailTarget, setDetailTarget] = useState<PlanChange | null>(null);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const tenantCodeById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.organizationCode ?? '—'));
    return map;
  }, [tenants]);

  // Feature count is this codebase's real, always-populated proxy for "how
  // much can this org do on this plan" (MonthlyPrice is often null for
  // reference/default plans, so it can't reliably rank them) - used only to
  // label a change Upgrade/Downgrade, never to gate anything.
  const featureCountByPlanName = useMemo(() => {
    const map = new Map<string, number>();
    (plans ?? []).forEach((p) => map.set(p.name, p.includedFeatures.length));
    return map;
  }, [plans]);

  const allChanges = useMemo<PlanChange[]>(() => {
    return (logs ?? [])
      .filter((log) => log.activity === 'Plan changed')
      .map((log) => {
        const [fromPlan, toPlan] = (log.details ?? '').split(' -> ');
        return {
          id: log.id,
          timestampUtc: log.timestampUtc,
          tenantId: log.tenantId,
          fromPlan: fromPlan || null,
          toPlan: toPlan || null,
          changedBy: log.userName,
        };
      });
  }, [logs]);

  const changedByOptions = useMemo(() => {
    const set = new Set<string>();
    allChanges.forEach((c) => c.changedBy && set.add(c.changedBy));
    return Array.from(set).sort();
  }, [allChanges]);

  const filteredChanges = useMemo(() => {
    return allChanges.filter((c) => {
      if (orgId && c.tenantId !== orgId) return false;
      if (planName && c.fromPlan !== planName && c.toPlan !== planName) return false;
      if (changedBy && c.changedBy !== changedBy) return false;
      if (fromDate && new Date(c.timestampUtc).getTime() < new Date(`${fromDate}T00:00:00`).getTime()) return false;
      if (toDate && new Date(c.timestampUtc).getTime() > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
      return true;
    });
  }, [allChanges, orgId, planName, changedBy, fromDate, toDate]);

  const directionOf = (c: PlanChange): 'up' | 'down' | null => {
    if (!c.fromPlan || !c.toPlan) return null;
    const from = featureCountByPlanName.get(c.fromPlan);
    const to = featureCountByPlanName.get(c.toPlan);
    if (from === undefined || to === undefined || from === to) return null;
    return to > from ? 'up' : 'down';
  };

  const stats = useMemo(() => {
    const orgSet = new Set(filteredChanges.map((c) => c.tenantId));
    const upgrades = filteredChanges.filter((c) => directionOf(c) === 'up').length;
    const downgrades = filteredChanges.filter((c) => directionOf(c) === 'down').length;
    const total = filteredChanges.length;
    return {
      total,
      organizations: orgSet.size,
      upgrades,
      downgrades,
      upgradePct: total === 0 ? 0 : Math.round((upgrades / total) * 100),
      downgradePct: total === 0 ? 0 : Math.round((downgrades / total) * 100),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredChanges, featureCountByPlanName]);

  const sortedChanges = useMemo(() => {
    const sorted = [...filteredChanges].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'date') {
        cmp = new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime();
      } else if (sortColumn === 'organization') {
        cmp = (tenantNameById.get(a.tenantId) ?? '').localeCompare(tenantNameById.get(b.tenantId) ?? '');
      } else {
        cmp = (a.changedBy ?? '').localeCompare(b.changedBy ?? '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredChanges, sortColumn, sortDirection, tenantNameById]);

  useEffect(() => {
    setPage(1);
  }, [orgId, planName, changedBy, fromDate, toDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedChanges.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedChanges = sortedChanges.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = sortedChanges.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, sortedChanges.length);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const applyFilters = () => {
    setOrgId(pendingOrgId);
    setPlanName(pendingPlanName);
    setChangedBy(pendingChangedBy);
    setFromDate(pendingFrom);
    setToDate(pendingTo);
  };

  const clearFilters = () => {
    setPendingOrgId('');
    setPendingPlanName('');
    setPendingChangedBy('');
    setPendingFrom('');
    setPendingTo('');
    setOrgId('');
    setPlanName('');
    setChangedBy('');
    setFromDate('');
    setToDate('');
  };

  const exportCsv = () => {
    const header = ['Date & Time', 'Organization', 'Org Code', 'From Plan', 'To Plan', 'Changed By', 'Notes'];
    const lines = sortedChanges.map((c) =>
      [
        new Date(c.timestampUtc).toLocaleString(),
        tenantNameById.get(c.tenantId) ?? '',
        tenantCodeById.get(c.tenantId) ?? '',
        c.fromPlan ?? '',
        c.toPlan ?? '',
        c.changedBy ?? '',
        'Plan changed by Super Admin',
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `examvault-subscription-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <PlatformLayout active="subs-history">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-start gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: '#e0e7ff', color: '#4f46e5' }}
          >
            <ClockIcon />
          </div>
          <div>
            <p className="text-muted small mb-1">Platform Admin / Subscriptions / Subscription History</p>
            <h1 className="h4 fw-bold mb-1 text-primary">Subscription History</h1>
            <p className="text-muted mb-0">
              A record of plan changes across organizations - who changed it, from which plan, to which.
            </p>
          </div>
        </div>
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" className="d-inline-flex align-items-center gap-2">
            <DownloadIcon /> Export
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item onClick={exportCsv} disabled={sortedChanges.length === 0}>
              Export as CSV
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <Row className="g-3 mb-3">
        <StatCard
          icon={<LayersIcon />}
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          label="Total Changes"
          value={stats.total}
          sublabel="Across all organizations"
        />
        <StatCard
          icon={<BuildingIcon />}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          label="Organizations"
          value={stats.organizations}
          sublabel="With plan changes"
        />
        <StatCard
          icon={<SwapIcon />}
          iconBg="#dbeafe"
          iconColor="#2563eb"
          label="Plan Upgrades"
          value={stats.upgrades}
          badge={{ text: `${stats.upgradePct}%`, variant: 'success' }}
        />
        <StatCard
          icon={<SwapIcon />}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
          label="Plan Downgrades"
          value={stats.downgrades}
          badge={{ text: `${stats.downgradePct}%`, variant: 'danger' }}
        />
      </Row>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                <BuildingSmallIcon /> Organization
              </Form.Label>
              <Form.Select value={pendingOrgId} onChange={(e) => setPendingOrgId(e.target.value)}>
                <option value="">All Organizations</option>
                {(tenants ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                <LayersSmallIcon /> Plan
              </Form.Label>
              <Form.Select value={pendingPlanName} onChange={(e) => setPendingPlanName(e.target.value)}>
                <option value="">All Plans</option>
                {(plans ?? []).map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                <UserSmallIcon /> Changed By
              </Form.Label>
              <Form.Select value={pendingChangedBy} onChange={(e) => setPendingChangedBy(e.target.value)}>
                <option value="">All Users</option>
                {changedByOptions.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                <CalendarSmallIcon /> Date Range
              </Form.Label>
              <div className="d-flex gap-1">
                <Form.Control type="date" size="sm" value={pendingFrom} onChange={(e) => setPendingFrom(e.target.value)} />
                <Form.Control type="date" size="sm" value={pendingTo} onChange={(e) => setPendingTo(e.target.value)} />
              </div>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="outline-secondary" className="d-inline-flex align-items-center gap-2" onClick={clearFilters}>
              <RefreshIcon /> Clear
            </Button>
            <Button variant="primary" className="d-inline-flex align-items-center gap-2" onClick={applyFilters}>
              <SearchIcon /> Search
            </Button>
          </div>
        </Card.Body>
      </Card>

      <h2 className="h6 fw-bold mb-2">Subscription History</h2>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || sortedChanges.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load subscription history. Please try again.</div>}

          {!isLoading && !isError && sortedChanges.length === 0 && (
            <div className="text-center text-muted py-5">
              {allChanges.length === 0 ? 'No plan changes recorded yet.' : 'No plan changes match your filters.'}
            </div>
          )}

          {!isLoading && !isError && sortedChanges.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>
                      <SortableHeader label="Date & Time" active={sortColumn === 'date'} direction={sortDirection} onClick={() => toggleSort('date')} />
                    </th>
                    <th>
                      <SortableHeader label="Organization" active={sortColumn === 'organization'} direction={sortDirection} onClick={() => toggleSort('organization')} />
                    </th>
                    <th>Plan Change</th>
                    <th>
                      <SortableHeader label="Changed By" active={sortColumn === 'changedBy'} direction={sortDirection} onClick={() => toggleSort('changedBy')} />
                    </th>
                    <th>Notes</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedChanges.map((c, i) => {
                    const orgName = tenantNameById.get(c.tenantId) ?? '—';
                    const direction = directionOf(c);
                    return (
                      <tr key={c.id}>
                        <td className="ps-4 text-muted">{rangeStart + i}</td>
                        <td>
                          <div>{new Date(c.timestampUtc).toLocaleString()}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>{timeAgo(c.timestampUtc)}</div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                              style={{ width: 32, height: 32, fontSize: 12 }}
                            >
                              {initialsFromName(orgName)}
                            </div>
                            <div>
                              <div className="fw-medium">{orgName}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>{tenantCodeById.get(c.tenantId) ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.fromPlan && c.toPlan ? (
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg="light" text="dark" className="border fw-normal">{c.fromPlan}</Badge>
                              <span className={direction === 'up' ? 'text-success' : direction === 'down' ? 'text-danger' : 'text-muted'}>&rarr;</span>
                              <Badge bg={direction === 'up' ? 'success' : direction === 'down' ? 'danger' : 'primary'} className="fw-normal">
                                {c.toPlan}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                              style={{ width: 32, height: 32, fontSize: 12 }}
                            >
                              {initialsFromEmail(c.changedBy)}
                            </div>
                            <div>
                              <div style={{ fontSize: 13 }}>{c.changedBy ?? '—'}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>SuperAdmin</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>Plan changed by Super Admin</td>
                        <td className="pe-4">
                          <Button variant="outline-secondary" size="sm" onClick={() => setDetailTarget(c)} title="View details">
                            <ViewIcon />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && sortedChanges.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {sortedChanges.length} entries
          </div>
          <div className="d-flex align-items-center gap-3">
            <Pagination className="mb-0">
              <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                  {p}
                </Pagination.Item>
              ))}
              <Pagination.Next disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
            </Pagination>
            <Form.Select size="sm" style={{ width: 100 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
      )}

      <Modal show={detailTarget !== null} onHide={() => setDetailTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Plan Change Details</Modal.Title>
        </Modal.Header>
        {detailTarget && (
          <Modal.Body>
            <div className="mb-3">
              <div className="text-muted small">Organization</div>
              <div className="fw-medium">{tenantNameById.get(detailTarget.tenantId) ?? '—'}</div>
              <div className="text-muted small">{tenantCodeById.get(detailTarget.tenantId) ?? '—'}</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small mb-1">Plan Change</div>
              {detailTarget.fromPlan && detailTarget.toPlan ? (
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="light" text="dark" className="border fw-normal">{detailTarget.fromPlan}</Badge>
                  <span className="text-muted">&rarr;</span>
                  <Badge bg="primary" className="fw-normal">{detailTarget.toPlan}</Badge>
                </div>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div className="mb-3">
              <div className="text-muted small">Changed By</div>
              <div className="fw-medium">{detailTarget.changedBy ?? '—'}</div>
              <div className="text-muted small">SuperAdmin</div>
            </div>
            <div className="mb-3">
              <div className="text-muted small">Date &amp; Time</div>
              <div className="fw-medium">{new Date(detailTarget.timestampUtc).toLocaleString()}</div>
              <div className="text-muted small">{timeAgo(detailTarget.timestampUtc)}</div>
            </div>
            <div>
              <div className="text-muted small">Notes</div>
              <div>Plan changed by Super Admin</div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </PlatformLayout>
  );
}
