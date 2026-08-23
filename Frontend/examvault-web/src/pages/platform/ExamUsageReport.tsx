import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import { listExams } from '../../api/examApi';

// Matches reports.png's Exam Usage screen. Partially real - Total Exams
// and Exams by Status became real by widening ExamsController.List's
// isAdmin check to also accept SuperAdmin (same shape as the two prior
// role-gate fixes this session), letting the existing GetAllAsync +
// IsSuperAdmin query-filter bypass do the actual cross-tenant scoping.
// Exam Attempts/Avg Pass %/Attempts Trend/Top Exams by Attempts stay
// honest placeholders - SubmissionsController has no cross-tenant
// attempts endpoint at all (only by-exam/{examId} and by-user/{userId},
// both requiring an ID the caller already has), so there is no real data
// to show without a genuinely new backend endpoint.
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

function NotConnectedCard({ title }: { title: string }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <h2 className="h6 fw-bold mb-3">{title}</h2>
        <div className="text-center text-muted small py-4">Not connected yet.</div>
      </Card.Body>
    </Card>
  );
}

export default function ExamUsageReport() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });

  const counts = useMemo(() => {
    const list = exams ?? [];
    return {
      total: list.length,
      Draft: list.filter((e) => e.status === 'Draft').length,
      Published: list.filter((e) => e.status === 'Published').length,
      Archived: list.filter((e) => e.status === 'Archived').length,
    };
  }, [exams]);

  return (
    <PlatformLayout active="reports-exam-usage">
      <p className="text-muted small mb-1">Platform Admin / Reports / Exam Usage</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Usage</h1>
      <p className="text-muted mb-3">Exam creation and status across the platform.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Exams"
              value={counts.total}
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
            />
            <StatCard
              label="Exam Attempts"
              value="—"
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
            />
            <StatCard
              label="Avg. Pass %"
              value="—"
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12l3 3 5-6" />
                </svg>
              }
            />
            <StatCard
              label="Published Exams"
              value={counts.Published}
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Exams by Status</h2>
                  <SegmentDonutChart
                    centerLabel="Total"
                    segments={[
                      { label: 'Published', value: counts.Published, color: '#16a34a' },
                      { label: 'Draft', value: counts.Draft, color: '#d97706' },
                      { label: 'Archived', value: counts.Archived, color: '#6b7280' },
                    ]}
                  />
                  <div className="d-flex flex-column gap-1 mt-2 small">
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#16a34a' }} />
                        Published
                      </span>
                      <span>{counts.Published}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#d97706' }} />
                        Draft
                      </span>
                      <span>{counts.Draft}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#6b7280' }} />
                        Archived
                      </span>
                      <span>{counts.Archived}</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <NotConnectedCard title="Exam Attempts Trend" />
            </Col>
          </Row>

          <NotConnectedCard title="Top Exams by Attempts" />
        </>
      )}
    </PlatformLayout>
  );
}
