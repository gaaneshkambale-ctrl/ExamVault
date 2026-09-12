import { useState } from 'react';
import { Badge, Card, Col, Form, InputGroup, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import ReportStatCard from '../../../components/reports/ReportStatCard';
import { listServiceStatus } from '../../../api/monitoringApi';
import type { ServiceHealthStatus } from '../../../types/monitoring';

const REFRESH_INTERVAL_MS = 15000;
const RESPONSE_TIME_CEILING_MS = 500;

const STATUS_VARIANT: Record<ServiceHealthStatus, string> = {
  Online: 'success',
  Degraded: 'warning',
  Offline: 'danger',
};

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
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

function AlertTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

const SERVICE_ICON_BG: Record<string, string> = {
  Gateway: '#eef2ff',
  'User Service': '#dbeafe',
  'Exam Service': '#ecfdf5',
  'Question Service': '#fff7ed',
  'AI Service': '#f0fdf4',
  'Submission Service': '#ede9fe',
  'Result Service': '#dcfce7',
  'Notification Service': '#fef9c3',
  'Execution Service': '#fce7f3',
};

function ServiceIconBadge({ name }: { name: string }) {
  const bg = SERVICE_ICON_BG[name] ?? '#f3f4f6';
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-2 flex-shrink-0 fw-bold"
      style={{ width: 32, height: 32, background: bg, fontSize: 12, color: '#4b5563' }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Real, cross-tenant data - GET /api/monitoring/services (SuperAdmin only),
// same query key ApiHealth.tsx/SystemHealth.tsx/MonitoringOverview.tsx use
// so React Query dedupes the fetch. No "Availability (24h)" column - there
// is no historical uptime store anywhere in this codebase (see the "System
// Monitoring" plan this was built from) - the response-time bar below is a
// real substitute (live responsiveness against a fixed ceiling), not a
// faked uptime percentage.
export default function ServiceStatus() {
  const queryClient = useQueryClient();
  const { data: services, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const [searchText, setSearchText] = useState('');

  const total = services?.length ?? 0;
  const online = services?.filter((s) => s.status === 'Online').length ?? 0;
  const degraded = services?.filter((s) => s.status === 'Degraded').length ?? 0;
  const offline = services?.filter((s) => s.status === 'Offline').length ?? 0;

  const searchQuery = searchText.trim().toLowerCase();
  const filteredServices = (services ?? []).filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery));

  return (
    <PlatformLayout active="mon-service-status">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Monitoring / Service Status</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Service Status</h1>
          <p className="text-muted mb-0">Live health of the Gateway and every backend service, polled every 15 seconds.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-light text-success border d-inline-flex align-items-center gap-1 py-2 px-3">
            <span className="rounded-circle bg-success" style={{ width: 8, height: 8, display: 'inline-block' }} />
            Auto refresh: On (15s)
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['monitoring-services'] })}
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

      {isError && <div className="text-center text-danger py-5">Couldn't load service status. Please try again.</div>}

      {!isLoading && !isError && services && (
        <>
          <Row xs={2} lg={4} className="g-3 mb-3">
            <Col>
              <ReportStatCard
                icon={<GridIcon />}
                label="Total Services"
                value={String(total)}
                caption="All configured services"
                iconBg="#eef2ff"
                iconColor="#4f46e5"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Online"
                value={String(online)}
                caption={total === 0 ? '0% of services' : `${((online / total) * 100).toFixed(0)}% of services`}
                iconBg="#ecfdf5"
                iconColor="#059669"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<AlertTriangleIcon />}
                label="Degraded"
                value={String(degraded)}
                caption={total === 0 ? '0% of services' : `${((degraded / total) * 100).toFixed(0)}% of services`}
                iconBg={degraded > 0 ? '#fff7ed' : '#f3f4f6'}
                iconColor={degraded > 0 ? '#d97706' : '#9ca3af'}
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<XCircleIcon />}
                label="Offline"
                value={String(offline)}
                caption={total === 0 ? '0% of services' : `${((offline / total) * 100).toFixed(0)}% of services`}
                iconBg={offline > 0 ? '#fee2e2' : '#f3f4f6'}
                iconColor={offline > 0 ? '#dc2626' : '#9ca3af'}
              />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h2 className="h6 fw-bold mb-0">All Services ({total})</h2>
                <InputGroup style={{ width: 260 }}>
                  <InputGroup.Text>
                    <SearchIcon />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search service..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </InputGroup>
              </div>

              {filteredServices.length === 0 ? (
                <div className="text-center text-muted py-4">No services match your search.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase">
                    <tr>
                      <th>Service Name</th>
                      <th>Status</th>
                      <th>Response Time</th>
                      <th style={{ width: 180 }}>Responsiveness</th>
                      <th className="pe-3">Last Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => {
                      const pct =
                        service.responseTimeMs === null
                          ? 0
                          : Math.max(4, 100 - Math.min(100, (service.responseTimeMs / RESPONSE_TIME_CEILING_MS) * 100));
                      const barVariant = service.status === 'Online' ? 'success' : service.status === 'Degraded' ? 'warning' : 'danger';
                      return (
                        <tr key={service.name}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <ServiceIconBadge name={service.name} />
                              <span className="fw-medium">{service.name}</span>
                            </div>
                          </td>
                          <td>
                            <Badge bg={STATUS_VARIANT[service.status]}>{service.status}</Badge>
                          </td>
                          <td className="text-muted">{service.responseTimeMs === null ? '—' : `${service.responseTimeMs} ms`}</td>
                          <td>
                            <ProgressBar now={pct} variant={barVariant} style={{ height: 6 }} />
                          </td>
                          <td className="pe-3 text-muted">{dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </PlatformLayout>
  );
}
