import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import { listAllUsers } from '../../api/userApi';
import { bucketByDay } from '../../utils/bucketByDay';

// Matches reports.png's User Report screen. Real - same stat cards and
// Users-by-Role donut as AllUsers.tsx (same underlying listAllUsers call),
// plus a New Users Trend that day-buckets real createdAtUtc timestamps -
// the first genuinely new derived-real widget added for Reports, no
// backend change needed.
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

export default function UserReport() {
  const { data: users, isLoading, isError } = useQuery({ queryKey: ['platform-users'], queryFn: listAllUsers });

  const counts = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      Admin: list.filter((u) => u.role === 'Admin').length,
      Student: list.filter((u) => u.role === 'Student').length,
      SuperAdmin: list.filter((u) => u.role === 'SuperAdmin').length,
      active: list.filter((u) => u.isActive).length,
      inactive: list.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const trend = useMemo(() => bucketByDay((users ?? []).map((u) => u.createdAtUtc), 14), [users]);

  return (
    <PlatformLayout active="reports-users">
      <p className="text-muted small mb-1">Platform Admin / Reports / User Report</p>
      <h1 className="h4 fw-bold mb-1 text-primary">User Report</h1>
      <p className="text-muted mb-3">Overview of users across every organization.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load users. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Users"
              value={counts.total}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Active Users"
              value={counts.active}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
            />
            <StatCard
              label="Students"
              value={counts.Student}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              }
            />
            <StatCard
              label="Organization Admins"
              value={counts.Admin}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">New Users Trend (last 14 days)</h2>
                  <ExamsTrendChart data={trend} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Users by Role</h2>
                  <SegmentDonutChart
                    centerLabel="Total"
                    segments={[
                      { label: 'Students', value: counts.Student, color: '#2563eb' },
                      { label: 'Organization Admins', value: counts.Admin, color: '#16a34a' },
                      { label: 'Platform Admins', value: counts.SuperAdmin, color: '#7c3aed' },
                    ]}
                  />
                  <div className="d-flex flex-column gap-1 mt-2 small">
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#2563eb' }} />
                        Students
                      </span>
                      <span>{counts.Student}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#16a34a' }} />
                        Organization Admins
                      </span>
                      <span>{counts.Admin}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#7c3aed' }} />
                        Platform Admins
                      </span>
                      <span>{counts.SuperAdmin}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PlatformLayout>
  );
}
