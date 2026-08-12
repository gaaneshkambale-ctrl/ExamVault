import { Card, Col, Row } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../hooks/useAuth';

const stats = [
  { label: 'Total Users', value: 0 },
  { label: 'Total Exams', value: 0 },
  { label: 'Total Questions', value: 0 },
  { label: 'Total Results', value: 0 },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <AdminLayout active="Dashboard">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">Welcome back, {user?.fullName ?? 'Admin'}!</h1>
        <p className="text-muted mb-0">Here's what's happening across ExamVault.</p>
      </div>

      <Row className="g-3 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="text-muted small mb-1">{stat.label}</div>
                <div className="h3 fw-bold mb-0">{stat.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center text-muted py-5">
          Exam analytics will appear here once exams are created.
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
