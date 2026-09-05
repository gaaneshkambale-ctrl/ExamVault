import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import ReportStatCard from '../../../components/reports/ReportStatCard';
import { getSystemHealth, listServiceStatus } from '../../../api/monitoringApi';

const REFRESH_INTERVAL_MS = 15000;

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function MessageQueueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// Real, cross-tenant health signals only - see the "System Monitoring" plan
// this was built from. Only 2 infra checks exist server-side (Database
// rollup across the 5 DB-backed services, RabbitMQ message queue) - the
// "Core Services" list below reuses the exact same 9-service probe
// Service Status shows (query key monitoring-services, dedupes the fetch)
// rather than inventing Redis/Storage/Email/Search rows this app has no
// such infrastructure for. No historical timeline or incident log exists
// anywhere in this codebase, so those mockup widgets are replaced with an
// honest note instead of decorative fake charts.
export default function SystemHealth() {
  const queryClient = useQueryClient();
  const { data: health, isLoading: healthLoading, isError: healthError, dataUpdatedAt } = useQuery({
    queryKey: ['monitoring-system-health'],
    queryFn: getSystemHealth,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const { data: services, isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const isLoading = healthLoading || servicesLoading;
  const isError = healthError || servicesError;

  const isHealthy = health?.database === 'Healthy' && health?.messageQueue === 'Healthy';
  const totalServices = services?.length ?? 0;
  const healthyServices = services?.filter((s) => s.status === 'Online').length ?? 0;
  const unhealthyServices = totalServices - healthyServices;

  return (
    <PlatformLayout active="mon-system-health">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Monitoring / System Health</p>
          <h1 className="h4 fw-bold mb-1 text-primary">System Health</h1>
          <p className="text-muted mb-0">
            Real-time status of shared platform infrastructure, polled every 15 seconds. Host-resource metrics
            (CPU/memory/disk) and historical uptime/incident tracking aren't shown - nothing in this deployment
            collects them yet.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-success border d-inline-flex align-items-center gap-1 py-2 px-3">
            <span className="rounded-circle bg-success" style={{ width: 8, height: 8, display: 'inline-block' }} />
            Auto refresh: On (15s)
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['monitoring-system-health'] })}
          >
            <RefreshIcon /> Refresh Now
          </button>
        </div>
      </div>
      {dataUpdatedAt > 0 && (
        <p className="text-muted small text-end mb-3">Last updated: {new Date(dataUpdatedAt).toLocaleString()}</p>
      )}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load system health. Please try again.</div>}

      {!isLoading && !isError && health && services && (
        <>
          <Row xs={2} lg={4} className="g-3 mb-3">
            <Col>
              <ReportStatCard
                icon={<ShieldCheckIcon />}
                label="Overall Health"
                value={isHealthy ? 'Healthy' : 'Degraded'}
                caption="All systems operational"
                iconBg={isHealthy ? '#ecfdf5' : '#fee2e2'}
                iconColor={isHealthy ? '#059669' : '#dc2626'}
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<LayersIcon />}
                label="Services"
                value={String(totalServices)}
                caption="Total services"
                iconBg="#eef2ff"
                iconColor="#4f46e5"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Healthy"
                value={String(healthyServices)}
                caption={totalServices === 0 ? '0% of services' : `${((healthyServices / totalServices) * 100).toFixed(0)}% of services`}
                iconBg="#ecfdf5"
                iconColor="#059669"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<AlertCircleIcon />}
                label="Unhealthy"
                value={String(unhealthyServices)}
                caption={totalServices === 0 ? '0% of services' : `${((unhealthyServices / totalServices) * 100).toFixed(0)}% of services`}
                iconBg={unhealthyServices > 0 ? '#fee2e2' : '#f3f4f6'}
                iconColor={unhealthyServices > 0 ? '#dc2626' : '#9ca3af'}
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Core Infrastructure</h2>
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span className="d-flex align-items-center gap-2">
                      <span className="text-primary"><DatabaseIcon /></span>
                      <span>
                        <div className="fw-medium">Database</div>
                        <div className="text-muted small">Rolls up all 5 database-backed services</div>
                      </span>
                    </span>
                    <Badge bg={health.database === 'Healthy' ? 'success' : 'danger'}>{health.database}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <span className="d-flex align-items-center gap-2">
                      <span className="text-primary"><MessageQueueIcon /></span>
                      <span>
                        <div className="fw-medium">Message Queue</div>
                        <div className="text-muted small">RabbitMQ message broker</div>
                      </span>
                    </span>
                    <Badge bg={health.messageQueue === 'Healthy' ? 'success' : 'danger'}>{health.messageQueue}</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center h-100">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: 64, height: 64, background: isHealthy ? '#ecfdf5' : '#fee2e2', color: isHealthy ? '#059669' : '#dc2626' }}
                  >
                    {isHealthy ? <CheckCircleIcon /> : <AlertCircleIcon />}
                  </div>
                  <h2 className="h6 fw-bold mb-1">{isHealthy ? 'All Clear!' : 'Attention Needed'}</h2>
                  <p className="text-muted small mb-0">
                    {isHealthy
                      ? 'Every monitored service is reporting healthy right now.'
                      : `${unhealthyServices} of ${totalServices} services aren't reporting healthy right now.`}
                  </p>
                  <p className="text-muted small mt-2 mb-0">
                    This reflects only the current, live check - no incident or status history is stored.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2">
                <h2 className="h6 fw-bold mb-0">All Services</h2>
                <Link to="/platform/monitoring/service-status" className="btn btn-outline-secondary btn-sm">
                  View All Services
                </Link>
              </div>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-body-tertiary">
                  <tr>
                    <th className="ps-4">Service</th>
                    <th>Status</th>
                    <th className="pe-4">Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.name}>
                      <td className="ps-4 fw-medium">{service.name}</td>
                      <td>
                        <Badge bg={service.status === 'Online' ? 'success' : service.status === 'Degraded' ? 'warning' : 'danger'}>
                          {service.status}
                        </Badge>
                      </td>
                      <td className="pe-4 text-muted">{service.responseTimeMs === null ? '—' : `${service.responseTimeMs} ms`}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </PlatformLayout>
  );
}
