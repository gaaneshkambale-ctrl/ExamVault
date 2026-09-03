import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import ReportStatCard from '../../../components/reports/ReportStatCard';
import { listServiceStatus } from '../../../api/monitoringApi';

const REFRESH_INTERVAL_MS = 15000;

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

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Semicircle response-time gauge - same hand-rolled SVG-arc technique as
// components/PercentageRing.tsx (no charting library), just a 180deg arc
// instead of a full circle to match the mockup's gauge shape.
function ResponseTimeGauge({ ms, max = 500 }: { ms: number; max?: number }) {
  const size = 220;
  const strokeWidth = 16;
  const radius = size / 2 - strokeWidth;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(max, ms));
  const offset = circumference * (1 - clamped / max);
  const color = clamped <= max * 0.4 ? '#16a34a' : clamped <= max * 0.7 ? '#d97706' : '#dc2626';
  const label = clamped <= max * 0.4 ? 'Good' : clamped <= max * 0.7 ? 'Fair' : 'Poor';
  const arcPath = `M ${strokeWidth} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${center}`;

  return (
    <div className="d-flex flex-column align-items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        <path d={arcPath} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text x={strokeWidth} y={center + 20} fontSize={11} fill="#9ca3af">0 ms</text>
        <text x={size - strokeWidth} y={center + 20} fontSize={11} fill="#9ca3af" textAnchor="end">{max} ms</text>
        <text x={center} y={center - 8} fontSize={26} fontWeight={700} fill="#111827" textAnchor="middle">{ms}</text>
        <text x={center} y={center + 10} fontSize={12} fill="#9ca3af" textAnchor="middle">ms</text>
      </svg>
      <div className="fw-medium" style={{ color }}>{label}</div>
      <div className="text-muted small">Average response time</div>
    </div>
  );
}

// Real, cross-tenant data only. There's no per-endpoint health check
// anywhere in this codebase (no route-level "GET /api/exams is healthy"
// tracking) - only per-service /health probes, the same 9-service list
// (Gateway + 8 backend services) Service Status shows, same query key
// (monitoring-services) so React Query dedupes the fetch. Framed here as
// each service's own API surface rather than fabricating an endpoint-level
// breakdown that doesn't exist. No 24h history chart - nothing stores past
// probe results, only the current live one.
export default function ApiHealth() {
  const queryClient = useQueryClient();
  const { data: services, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const [searchText, setSearchText] = useState('');

  const total = services?.length ?? 0;
  const healthy = services?.filter((s) => s.status === 'Online').length ?? 0;
  const degraded = services?.filter((s) => s.status === 'Degraded').length ?? 0;
  const down = services?.filter((s) => s.status === 'Offline').length ?? 0;
  const avgResponseMs = useMemo(() => {
    const values = (services ?? []).map((s) => s.responseTimeMs).filter((v): v is number => v !== null);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }, [services]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredServices = (services ?? []).filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery));

  return (
    <PlatformLayout active="mon-api-health">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / System Monitoring / API Health</p>
          <h1 className="h4 fw-bold mb-1 text-primary">API Health</h1>
          <p className="text-muted mb-0">
            Monitor the health and availability of every platform API's backing service, polled every 15 seconds.
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

      {isError && <div className="text-center text-danger py-5">Couldn't load API health. Please try again.</div>}

      {!isLoading && !isError && services && (
        <>
          <Row xs={2} lg={5} className="g-3 mb-3">
            <Col>
              <ReportStatCard
                icon={<GridIcon />}
                label="Total APIs"
                value={String(total)}
                caption="Across all services"
                iconBg="#eef2ff"
                iconColor="#4f46e5"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Healthy APIs"
                value={String(healthy)}
                caption={total === 0 ? '0%' : `${((healthy / total) * 100).toFixed(2)}%`}
                iconBg="#ecfdf5"
                iconColor="#059669"
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<AlertTriangleIcon />}
                label="Degraded APIs"
                value={String(degraded)}
                caption={total === 0 ? '0%' : `${((degraded / total) * 100).toFixed(2)}%`}
                iconBg={degraded > 0 ? '#fff7ed' : '#f3f4f6'}
                iconColor={degraded > 0 ? '#d97706' : '#9ca3af'}
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<XCircleIcon />}
                label="Down APIs"
                value={String(down)}
                caption={total === 0 ? '0%' : `${((down / total) * 100).toFixed(2)}%`}
                iconBg={down > 0 ? '#fee2e2' : '#f3f4f6'}
                iconColor={down > 0 ? '#dc2626' : '#9ca3af'}
              />
            </Col>
            <Col>
              <ReportStatCard
                icon={<ClockIcon />}
                label="Avg. Response Time"
                value={`${avgResponseMs} ms`}
                caption="Live average"
                iconBg="#dbeafe"
                iconColor="#2563eb"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">API List</h2>
                  <InputGroup className="mb-3" style={{ maxWidth: 320 }}>
                    <InputGroup.Text>
                      <SearchIcon />
                    </InputGroup.Text>
                    <Form.Control
                      type="search"
                      placeholder="Search API..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </InputGroup>
                  {filteredServices.length === 0 ? (
                    <div className="text-center text-muted py-4">No APIs match your search.</div>
                  ) : (
                    <Table responsive hover className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th>API</th>
                          <th>Status</th>
                          <th className="pe-3">Response Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredServices.map((service) => (
                          <tr key={service.name}>
                            <td>
                              <div className="fw-medium">{service.name}</div>
                              <div className="text-muted" style={{ fontSize: 12 }}>
                                {service.name} API
                              </div>
                            </td>
                            <td>
                              <Badge bg={service.status === 'Online' ? 'success' : service.status === 'Degraded' ? 'warning' : 'danger'}>
                                {service.status}
                              </Badge>
                            </td>
                            <td className="pe-3 text-muted">{service.responseTimeMs === null ? '—' : `${service.responseTimeMs} ms`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <h2 className="h6 fw-bold mb-3 align-self-start">Response Time</h2>
                  <ResponseTimeGauge ms={avgResponseMs} />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PlatformLayout>
  );
}
