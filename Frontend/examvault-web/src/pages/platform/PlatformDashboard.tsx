import { Card, Col, Row, Spinner } from 'react-bootstrap';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Col md={4}>
      <Card className="border-0 shadow-sm h-100">
        <Card.Body>
          <div className="text-muted small mb-1">{label}</div>
          <div className="h3 fw-bold mb-0">{value}</div>
        </Card.Body>
      </Card>
    </Col>
  );
}

export default function PlatformDashboard() {
  const { data: tenants, isLoading, isError } = useTenants();

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((t) => t.isActive).length ?? 0;
  const inactive = total - active;

  return (
    <PlatformLayout active="dashboard">
      <p className="text-muted small mb-1">Platform Admin</p>
      <h1 className="h4 fw-bold mb-3 text-primary">Dashboard</h1>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load platform stats. Please try again.</div>}

      {!isLoading && !isError && (
        <Row className="g-3">
          <StatCard label="Total Organizations" value={total} />
          <StatCard label="Active Organizations" value={active} />
          <StatCard label="Inactive Organizations" value={inactive} />
        </Row>
      )}
    </PlatformLayout>
  );
}
