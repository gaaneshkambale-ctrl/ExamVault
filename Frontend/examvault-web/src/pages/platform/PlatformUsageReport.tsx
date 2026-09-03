import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import LineTrendChart from '../../components/charts/LineTrendChart';
import ReportFilters from '../../components/reports/ReportFilters';
import { getAuditLogs } from '../../api/auditApi';
import { listAllUsers } from '../../api/userApi';
import { bucketByDay, getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

function StatCard({ icon, iconBg, label, value, caption }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode; caption?: string }) {
  return (
    <Col>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body className="d-flex gap-3 align-items-start">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: iconBg }}
          >
            {icon}
          </span>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="h4 fw-bold mb-0">{value}</div>
            {caption && <div className="text-muted small">{caption}</div>}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function NotConnectedCard({ title, note }: { title: string; note: string }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center h-100">
        <h2 className="h6 fw-bold mb-3 align-self-start">{title}</h2>
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
          style={{ width: 48, height: 48, background: '#eef2ff', color: '#4f46e5' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        </span>
        <div className="fw-medium">Not connected yet</div>
        <div className="text-muted small">{note}</div>
      </Card.Body>
    </Card>
  );
}

function pctDelta(current: number, prior: number): string {
  if (prior === 0) return current === 0 ? '0%' : 'New';
  const pct = ((current - prior) / prior) * 100;
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
}

// Matches d.platform uses.png's Platform Usage screen. Total Logins/Unique
// Users, the trend, the Today/This Week/Last Week/Daily Average strip, and
// the Login Activity Overview table are all real - built from the same
// SuperAdmin-scoped GET /api/audit-logs "User login" events Security >
// Login Activity already uses, just re-shaped as a trend/table. Active
// Sessions/API Calls/Storage Used stay honest placeholders - no session
// tracking, API-call metering, or storage-usage collection exists anywhere
// in this codebase.
export default function PlatformUsageReport() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO),
  });
  const { data: users } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const [range, setRange] = useState<DateRange>(() => getDefaultRange(14));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const activeUserIds = useMemo(() => new Set((users ?? []).filter((u) => u.isActive).map((u) => u.id)), [users]);

  const allLogins = useMemo(() => (logs ?? []).filter((log) => log.module === 'Auth' && log.activity === 'User login'), [logs]);

  const loginsInRange = useMemo(() => allLogins.filter((l) => isWithinRange(l.timestampUtc, range)), [allLogins, range]);
  const uniqueUsersInRange = new Set(loginsInRange.map((l) => l.userId)).size;

  const trendBuckets = useMemo(() => bucketByDay(allLogins.map((l) => l.timestampUtc), range), [allLogins, range]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayCount = allLogins.filter((l) => l.timestampUtc.slice(0, 10) === todayKey).length;
  const yesterdayCount = allLogins.filter((l) => l.timestampUtc.slice(0, 10) === yesterdayKey).length;

  const thisWeekRange = useMemo(() => getDefaultRange(7), []);
  const lastWeekRange = useMemo(() => {
    const to = new Date(thisWeekRange.from);
    to.setDate(to.getDate() - 1);
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [thisWeekRange]);
  const thisWeekCount = allLogins.filter((l) => isWithinRange(l.timestampUtc, thisWeekRange)).length;
  const lastWeekCount = allLogins.filter((l) => isWithinRange(l.timestampUtc, lastWeekRange)).length;
  const dailyAverage = trendBuckets.length === 0 ? 0 : trendBuckets.reduce((sum, b) => sum + b.count, 0) / trendBuckets.length;

  const dailyRows = useMemo(() => {
    return [...trendBuckets].reverse().map((bucket) => {
      const dayLogins = allLogins.filter((l) => l.timestampUtc.slice(0, 10) === bucket.date);
      const uniqueUsers = new Set(dayLogins.map((l) => l.userId));
      const newUsers = (users ?? []).filter((u) => u.createdAtUtc.slice(0, 10) === bucket.date).length;
      const activeUsers = [...uniqueUsers].filter((id) => id && activeUserIds.has(id)).length;
      return { date: bucket.date, label: bucket.label, totalLogins: bucket.count, uniqueUsers: uniqueUsers.size, newUsers, activeUsers };
    });
  }, [trendBuckets, allLogins, users, activeUserIds]);

  useEffect(() => {
    setPage(1);
  }, [range, pageSize]);

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = dailyRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = dailyRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, dailyRows.length);

  return (
    <PlatformLayout active="reports-platform-usage">
      <div className="mb-1">
        <p className="text-muted small mb-1">Platform Admin / Reports / Platform Usage</p>
        <h1 className="h4 fw-bold mb-1 text-primary">Platform Usage</h1>
        <p className="text-muted mb-0">Platform-wide login activity and system usage overview.</p>
      </div>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => setRange(getDefaultRange(14))}
        exportFilename="platform-usage-report"
        exportHeaders={['Date', 'Total Logins', 'Unique Users', 'New Users', 'Active Users']}
        exportRows={() => dailyRows.map((r) => [r.label, r.totalLogins, r.uniqueUsers, r.newUsers, r.activeUsers])}
      />

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load usage data. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Logins"
              value={loginsInRange.length}
              caption="Within selected range"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              }
            />
            <StatCard
              label="Unique Users"
              value={uniqueUsersInRange}
              caption="Distinct users logged in"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Active Sessions"
              value="—"
              caption="Not connected yet"
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            <StatCard
              label="API Calls"
              value="—"
              caption="Not connected yet"
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Logins Over Time</h2>
                  <LineTrendChart
                    height={220}
                    series={[{ name: 'Logins', color: '#2563eb', data: trendBuckets.map((b) => ({ label: b.label, value: b.count })) }]}
                  />
                  <Row className="g-3 mt-1 text-center">
                    <Col xs={6} md={3}>
                      <div className="text-muted small">Today Logins</div>
                      <div className="h5 fw-bold mb-0">{todayCount}</div>
                      <div className="small text-success">{pctDelta(todayCount, yesterdayCount)} vs yesterday</div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-muted small">This Week</div>
                      <div className="h5 fw-bold mb-0">{thisWeekCount}</div>
                      <div className="small text-success">{pctDelta(thisWeekCount, lastWeekCount)} vs last week</div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-muted small">Last Week</div>
                      <div className="h5 fw-bold mb-0">{lastWeekCount}</div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-muted small">Daily Average</div>
                      <div className="h5 fw-bold mb-0">{dailyAverage.toFixed(1)}</div>
                      <div className="small text-muted">Logins per day</div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <NotConnectedCard title="Storage Used" note="Storage usage data will appear here once the integration is available." />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={dailyRows.length === 0 ? '' : 'p-0'}>
              <div className="px-4 pt-3 pb-2">
                <h2 className="h6 fw-bold mb-0">Login Activity Overview</h2>
              </div>
              {dailyRows.length === 0 ? (
                <div className="text-center text-muted py-5">No login activity in this range.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Date</th>
                      <th>Total Logins</th>
                      <th>Unique Users</th>
                      <th>New Users</th>
                      <th>Active Users</th>
                      <th className="pe-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => (
                      <tr key={row.date}>
                        <td className="ps-4">{row.label}</td>
                        <td className="text-muted">{row.totalLogins}</td>
                        <td className="text-muted">{row.uniqueUsers}</td>
                        <td className="text-muted">{row.newUsers}</td>
                        <td className="text-muted">{row.activeUsers}</td>
                        <td className="pe-4 text-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {dailyRows.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {dailyRows.length} days
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
        </>
      )}
    </PlatformLayout>
  );
}
