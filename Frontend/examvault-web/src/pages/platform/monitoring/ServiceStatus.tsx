import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import { listServiceStatus } from '../../../api/monitoringApi';
import type { ServiceHealthStatus } from '../../../types/monitoring';

const REFRESH_INTERVAL_MS = 15000;

const STATUS_VARIANT: Record<ServiceHealthStatus, string> = {
  Online: 'success',
  Degraded: 'warning',
  Offline: 'danger',
};

export default function ServiceStatus() {
  const { data: services, isLoading, isError } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: listServiceStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const total = services?.length ?? 0;
  const online = services?.filter((s) => s.status === 'Online').length ?? 0;
  const degraded = services?.filter((s) => s.status === 'Degraded').length ?? 0;
  const offline = services?.filter((s) => s.status === 'Offline').length ?? 0;

  return (
    <PlatformLayout active="mon-service-status">
      <p className="text-muted small mb-1">Platform Admin / System Monitoring / Service Status</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Service Status</h1>
      <p className="text-muted mb-3">Live health of the Gateway and every backend service, polled every 15 seconds.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load service status. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Services</div>
                  <div className="h4 fw-bold mb-0">{total}</div>
                </Card.Body>
              </Card>
            </div>
            <div className="col-6 col-md-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Online</div>
                  <div className="h4 fw-bold mb-0 text-success">{online}</div>
                </Card.Body>
              </Card>
            </div>
            <div className="col-6 col-md-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Degraded</div>
                  <div className="h4 fw-bold mb-0 text-warning">{degraded}</div>
                </Card.Body>
              </Card>
            </div>
            <div className="col-6 col-md-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Offline</div>
                  <div className="h4 fw-bold mb-0 text-danger">{offline}</div>
                </Card.Body>
              </Card>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">Service Name</th>
                    <th>Status</th>
                    <th className="pe-4">Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {services?.map((service) => (
                    <tr key={service.name}>
                      <td className="ps-4 fw-medium">{service.name}</td>
                      <td>
                        <Badge bg={STATUS_VARIANT[service.status]}>{service.status}</Badge>
                      </td>
                      <td className="pe-4 text-muted">
                        {service.responseTimeMs === null ? '—' : `${service.responseTimeMs} ms`}
                      </td>
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
