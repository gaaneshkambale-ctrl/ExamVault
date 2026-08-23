import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { listAllUsers } from '../../api/userApi';

// Matches subscription.png's Usage screen. Total Students is real - only
// possible because of the same-day User Service tenant-scoping fix
// (GetAllAsync now safely returns every user for a Super Admin caller).
// Exams Conducted/Active Exams/Storage Used/API Calls have no
// cross-tenant aggregation anywhere in this codebase (Exam Service has
// no Super-Admin-facing "all exams" endpoint, and storage/API-call
// metering don't exist as tracked concepts at all) - honest placeholders,
// same as the Usage Overview trend chart and Usage by Plan breakdown.
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

export default function PlatformUsage() {
  const { data: users, isLoading, isError } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });
  const totalStudents = users?.filter((u) => u.role === 'Student').length ?? 0;

  return (
    <PlatformLayout active="subs-usage">
      <p className="text-muted small mb-1">Platform Admin / Subscriptions / Usage</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Usage</h1>
      <p className="text-muted mb-3">Monitor platform usage across organizations.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load usage stats. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={5} className="g-3 mb-3">
            <StatCard
              label="Total Students"
              value={totalStudents}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Exams Conducted"
              value="—"
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Active Exams"
              value="—"
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            />
            <StatCard
              label="Storage Used"
              value="—"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                </svg>
              }
            />
            <StatCard
              label="API Calls"
              value="—"
              iconBg="#fee2e2"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Usage Overview</h2>
                  <div className="text-center text-muted small py-5 border rounded-3">Not connected yet.</div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Top Organizations by Usage</h2>
                  <div className="text-center text-muted small py-5 border rounded-3">Not connected yet.</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Usage by Plan</h2>
              <div className="text-center text-muted small py-5 border rounded-3">Not connected yet.</div>
            </Card.Body>
          </Card>
        </>
      )}
    </PlatformLayout>
  );
}
