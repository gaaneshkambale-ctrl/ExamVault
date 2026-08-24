import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import { useTenants } from '../../../hooks/useTenants';
import { listExams } from '../../../api/examApi';
import { listServiceStatus, getSystemHealth } from '../../../api/monitoringApi';
import type { ExamResponse } from '../../../types/exam';

const REFRESH_INTERVAL_MS = 15000;
const PREVIEW_ROWS = 5;

type ExamWindowStatus = 'Live' | 'Upcoming';

function toWindowStatus(exam: ExamResponse, now: number): ExamWindowStatus | null {
  const startsAt = new Date(exam.startAtUtc!).getTime();
  if (startsAt > now) return 'Upcoming';
  const endsAt = exam.endAtUtc ? new Date(exam.endAtUtc).getTime() : null;
  return endsAt === null || endsAt >= now ? 'Live' : null;
}

function StatCard({ icon, iconBg, label, value }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode }) {
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
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function WidgetCard({ title, viewAllPath, children }: { title: string; viewAllPath: string; children: ReactNode }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 fw-bold mb-0">{title}</h2>
          <Link to={viewAllPath} className="small text-decoration-none">
            View All &rarr;
          </Link>
        </div>
        {children}
      </Card.Body>
    </Card>
  );
}

export default function MonitoringOverview() {
  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError } = useTenants();
  const { data: exams, isLoading: examsLoading, isError: examsError } = useQuery({
    queryKey: ['platform-exams'],
    queryFn: listExams,
  });
  const { data: services, isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: ['monitoring-system-health'],
    queryFn: getSystemHealth,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const isLoading = tenantsLoading || examsLoading || servicesLoading || healthLoading;
  const isError = tenantsError || examsError || servicesError || healthError;

  const activeTenants = tenants?.filter((t) => t.isActive) ?? [];

  const activeExams = useMemo(() => {
    const now = Date.now();
    return (exams ?? [])
      .filter((exam) => exam.status === 'Published' && exam.startAtUtc)
      .map((exam) => ({ exam, windowStatus: toWindowStatus(exam, now), startsAt: new Date(exam.startAtUtc!).getTime() }))
      .filter((entry): entry is { exam: ExamResponse; windowStatus: ExamWindowStatus; startsAt: number } => entry.windowStatus !== null)
      .sort((a, b) => a.startsAt - b.startsAt);
  }, [exams]);

  const servicesOnline = services?.filter((s) => s.status === 'Online').length ?? 0;
  const servicesTotal = services?.length ?? 0;
  const isSystemHealthy = health?.database === 'Healthy' && health?.messageQueue === 'Healthy';

  return (
    <PlatformLayout active="mon-active-orgs">
      <p className="text-muted small mb-1">Platform Admin / System Monitoring</p>
      <h1 className="h4 fw-bold mb-1 text-primary">System Monitoring</h1>
      <p className="text-muted mb-3">Monitor platform activity and system health in real-time.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load monitoring data. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={3} className="g-3 mb-3">
            <StatCard
              label="Active Organizations"
              value={activeTenants.length}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Active Exams"
              value={activeExams.length}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Services Online"
              value={`${servicesOnline} / ${servicesTotal}`}
              iconBg={isSystemHealthy ? '#dcfce7' : '#fee2e2'}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isSystemHealthy ? '#16a34a' : '#dc2626'}
                  strokeWidth="2"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={6}>
              <WidgetCard title="Active Organizations" viewAllPath="/platform/monitoring/active-organizations">
                {activeTenants.length === 0 ? (
                  <div className="text-center text-muted small py-4">No active organizations.</div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {activeTenants.slice(0, PREVIEW_ROWS).map((tenant) => (
                      <div key={tenant.id} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                        <span className="fw-medium">{tenant.name}</span>
                        <Badge bg="success">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>
            </Col>
            <Col lg={6}>
              <WidgetCard title="Active Exams" viewAllPath="/platform/monitoring/active-exams">
                {activeExams.length === 0 ? (
                  <div className="text-center text-muted small py-4">No live or upcoming exams.</div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {activeExams.slice(0, PREVIEW_ROWS).map(({ exam, windowStatus }) => (
                      <div key={exam.id} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                        <span className="fw-medium">{exam.title}</span>
                        <Badge bg={windowStatus === 'Live' ? 'success' : 'warning'}>{windowStatus}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={5}>
              <WidgetCard title="System Health" viewAllPath="/platform/monitoring/system-health">
                {health && (
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                      <span className="fw-medium">Database</span>
                      <Badge bg={health.database === 'Healthy' ? 'success' : 'danger'}>{health.database}</Badge>
                    </div>
                    <div className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                      <span className="fw-medium">Message Queue</span>
                      <Badge bg={health.messageQueue === 'Healthy' ? 'success' : 'danger'}>{health.messageQueue}</Badge>
                    </div>
                  </div>
                )}
              </WidgetCard>
            </Col>
            <Col lg={7}>
              <WidgetCard title="Service Status" viewAllPath="/platform/monitoring/service-status">
                <Table size="sm" className="mb-0 align-middle">
                  <tbody>
                    {services?.slice(0, PREVIEW_ROWS).map((service) => (
                      <tr key={service.name}>
                        <td className="fw-medium small">{service.name}</td>
                        <td className="text-end">
                          <Badge bg={service.status === 'Online' ? 'success' : service.status === 'Degraded' ? 'warning' : 'danger'}>
                            {service.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </WidgetCard>
            </Col>
          </Row>
        </>
      )}
    </PlatformLayout>
  );
}
