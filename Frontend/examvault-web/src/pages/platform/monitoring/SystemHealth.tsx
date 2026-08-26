import { Badge, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import { getSystemHealth } from '../../../api/monitoringApi';
import type { ComponentHealthStatus } from '../../../types/monitoring';

const REFRESH_INTERVAL_MS = 15000;

function ComponentRow({ label, status }: { label: string; status: ComponentHealthStatus }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span className="fw-medium">{label}</span>
      <Badge bg={status === 'Healthy' ? 'success' : 'danger'}>{status}</Badge>
    </div>
  );
}

export default function SystemHealth() {
  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['monitoring-system-health'],
    queryFn: getSystemHealth,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const isHealthy = health?.database === 'Healthy' && health?.messageQueue === 'Healthy';

  return (
    <PlatformLayout active="mon-system-health">
      <p className="text-muted small mb-1">Platform Admin / System Monitoring / System Health</p>
      <h1 className="h4 fw-bold mb-1 text-primary">System Health</h1>
      <p className="text-muted mb-3">
        Real-time status of shared platform infrastructure, polled every 15 seconds. Host-resource metrics
        (CPU/memory/disk) aren't shown - nothing in this deployment collects them yet.
      </p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load system health. Please try again.</div>}

      {!isLoading && !isError && health && (
        <Card className="border-0 shadow-sm" style={{ maxWidth: 480 }}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-bold mb-0">Overall Health</h2>
              <Badge bg={isHealthy ? 'success' : 'danger'}>{isHealthy ? 'Healthy' : 'Degraded'}</Badge>
            </div>
            <ComponentRow label="Database" status={health.database} />
            <ComponentRow label="Message Queue" status={health.messageQueue} />
          </Card.Body>
        </Card>
      )}
    </PlatformLayout>
  );
}
