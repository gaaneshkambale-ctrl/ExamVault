import { useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import LineTrendChart from '../../components/charts/LineTrendChart';
import DonutChart from '../../components/charts/DonutChart';
import { ActivityIcon, LogInIcon, DatabaseIcon, BookIcon, ShieldAlertIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useViolationsByExam } from '../../hooks/useSubmissions';
import { violationLabel } from '../../utils/proctoring';
import { bucketByDay, getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AuditModule } from '../../types/audit';

const MODULE_OPTIONS: { value: AuditModule | 'All'; label: string }[] = [
  { value: 'All', label: 'All Activities' },
  { value: 'Auth', label: 'Auth' },
  { value: 'Users', label: 'Users' },
  { value: 'Exams', label: 'Exams' },
  { value: 'Questions', label: 'Questions' },
  { value: 'Security', label: 'Security' },
];

interface ActivityRow {
  id: string;
  timestampUtc: string;
  module: AuditModule;
  userId: string | null;
  userName: string;
  activity: string;
  details: string;
  ipAddress: string;
}

export default function AuditReports() {
  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [moduleFilter, setModuleFilter] = useState<AuditModule | 'All'>('All');
  const [userFilter, setUserFilter] = useState('All');

  const { data: exams } = useExams();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { violationsByExam, isLoading: isLoadingViolations } = useViolationsByExam(examIds);

  const fromUtc = `${range.from}T00:00:00.000Z`;
  const toUtc = `${range.to}T23:59:59.999Z`;
  const { data: auditLogs, isLoading: isLoadingAudit, isError } = useAuditLogs(fromUtc, toUtc);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users ?? []) map.set(u.id, u.fullName);
    return map;
  }, [users]);

  const loading = isLoadingUsers || isLoadingViolations || isLoadingAudit;

  const allRows: ActivityRow[] = useMemo(() => {
    const fromAudit: ActivityRow[] = (auditLogs ?? []).map((log) => ({
      id: log.id,
      timestampUtc: log.timestampUtc,
      module: log.module,
      userId: log.userId,
      userName: log.userName ?? (log.userId ? (userNameById.get(log.userId) ?? 'Unknown') : 'System'),
      activity: log.activity,
      details: log.details ?? '',
      ipAddress: log.ipAddress ?? '—',
    }));

    const fromViolations: ActivityRow[] = Object.values(violationsByExam)
      .flat()
      .filter((v) => isWithinRange(v.detectedAtUtc, range))
      .map((v) => ({
        id: v.id,
        timestampUtc: v.detectedAtUtc,
        module: 'Security' as AuditModule,
        userId: v.userId,
        userName: userNameById.get(v.userId) ?? 'Unknown',
        activity: violationLabel[v.type],
        details: `${v.severity} severity · ${v.status}`,
        ipAddress: '—',
      }));

    return [...fromAudit, ...fromViolations].sort(
      (a, b) => new Date(b.timestampUtc).getTime() - new Date(a.timestampUtc).getTime(),
    );
  }, [auditLogs, violationsByExam, userNameById, range]);

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (moduleFilter === 'All' || r.module === moduleFilter) &&
          (userFilter === 'All' || r.userId === userFilter),
      ),
    [allRows, moduleFilter, userFilter],
  );

  const kpis = useMemo(
    () => ({
      total: filteredRows.length,
      userLogins: filteredRows.filter((r) => r.module === 'Auth').length,
      dataChanges: filteredRows.filter((r) => r.module === 'Users' || r.module === 'Questions').length,
      examActions: filteredRows.filter((r) => r.module === 'Exams').length,
      securityEvents: filteredRows.filter((r) => r.module === 'Security').length,
    }),
    [filteredRows],
  );

  const activityOverview = useMemo(
    () => bucketByDay(filteredRows.map((r) => r.timestampUtc), range),
    [filteredRows, range],
  );

  const activityByType = useMemo(() => {
    const userManagement = filteredRows.filter((r) => r.module === 'Auth' || r.module === 'Users').length;
    const examManagement = filteredRows.filter((r) => r.module === 'Exams').length;
    const dataChanges = filteredRows.filter((r) => r.module === 'Questions').length;
    const security = filteredRows.filter((r) => r.module === 'Security').length;
    return [
      { label: 'User Management', value: userManagement, color: '#4f46e5' },
      { label: 'Exam Management', value: examManagement, color: '#f59e0b' },
      { label: 'Data Changes', value: dataChanges, color: '#22c55e' },
      { label: 'Security Events', value: security, color: '#ef4444' },
    ];
  }, [filteredRows]);

  return (
    <AdminLayout active="Audit Reports">
      <h1 className="h4 fw-bold mb-1 text-primary">Audit Reports</h1>
      <p className="text-muted mb-4">Track and review system activities and changes.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setModuleFilter('All');
          setUserFilter('All');
        }}
        exportFilename="audit-reports"
        exportHeaders={['Time', 'User', 'Activity', 'Module', 'Details', 'IP Address']}
        exportRows={() =>
          filteredRows.map((r) => [
            new Date(r.timestampUtc).toLocaleString(),
            r.userName,
            r.activity,
            r.module,
            r.details,
            r.ipAddress,
          ])
        }
      >
        <Col xs="auto">
          <Form.Select
            size="sm"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as AuditModule | 'All')}
            style={{ maxWidth: 180 }}
          >
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="All">All Users</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Form.Select>
        </Col>
      </ReportFilters>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && isError && (
        <div className="text-center text-danger py-5">Couldn't load audit activity. Please try again.</div>
      )}

      {!loading && !isError && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<ActivityIcon />} label="Total Activities" value={kpis.total.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<LogInIcon />} label="User Logins" value={kpis.userLogins.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<DatabaseIcon />} label="Data Changes" value={kpis.dataChanges.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<BookIcon />} label="Exam Actions" value={kpis.examActions.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<ShieldAlertIcon />}
                label="Security Events"
                value={kpis.securityEvents.toLocaleString()}
                iconBg="#fef2f2"
                iconColor="#dc2626"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Activity Overview</h2>
                  <LineTrendChart
                    series={[{ name: 'Activities', color: '#4f46e5', data: activityOverview.map((b) => ({ label: b.label, value: b.count })) }]}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Activity by Type</h2>
                  <DonutChart data={activityByType} centerLabel="Activities" />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <h2 className="h6 fw-bold p-3 pb-2 mb-0">Recent Activities</h2>
              {filteredRows.length === 0 ? (
                <div className="text-center text-muted py-5">No activity in this range yet.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>User</th>
                      <th>Activity</th>
                      <th>Module</th>
                      <th>Details</th>
                      <th className="pe-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 100).map((r) => (
                      <tr key={r.id}>
                        <td className="ps-4">{new Date(r.timestampUtc).toLocaleString()}</td>
                        <td className="fw-medium">{r.userName}</td>
                        <td>{r.activity}</td>
                        <td>{r.module}</td>
                        <td className="text-muted small">{r.details}</td>
                        <td className="pe-4">{r.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {filteredRows.length > 100 && (
                <div className="text-center text-muted small py-2 border-top">
                  Showing latest 100 of {filteredRows.length}. Use Export for the full range.
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
