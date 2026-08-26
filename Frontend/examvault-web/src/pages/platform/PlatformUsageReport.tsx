import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ExamsTrendChart from '../../components/ExamsTrendChart';
import { getAuditLogs } from '../../api/auditApi';
import { bucketByDay } from '../../utils/bucketByDay';

// Matches reports.png's Platform Usage screen. Real - Total Logins/Unique
// Users and a Logins Over Time trend, reusing the same Audit Logs
// "User login" filtering as Security > Login Activity, just re-shaped as
// a day-bucketed trend instead of a table. Anything session/API-call/
// storage related stays an honest placeholder - no such data is recorded
// anywhere in this codebase.
const DEFAULT_FROM = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_TO = new Date().toISOString();

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

export default function PlatformUsageReport() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['platform-audit-logs'],
    queryFn: () => getAuditLogs(DEFAULT_FROM, DEFAULT_TO),
  });

  const logins = (logs ?? []).filter((log) => log.module === 'Auth' && log.activity === 'User login');
  const uniqueUsers = new Set(logins.map((l) => l.userId)).size;
  const trend = useMemo(() => bucketByDay(logins.map((l) => l.timestampUtc), 14), [logins]);

  return (
    <PlatformLayout active="reports-platform-usage">
      <p className="text-muted small mb-1">Platform Admin / Reports / Platform Usage</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Platform Usage</h1>
      <p className="text-muted mb-3">Platform-wide login activity.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load usage data. Please try again.</div>}

      {!isLoading && !isError && (
        <>
          <Row xs={1} sm={2} lg={4} className="g-3 mb-3">
            <StatCard
              label="Total Logins"
              value={logins.length}
              iconBg="#dbeafe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              }
            />
            <StatCard
              label="Unique Users"
              value={uniqueUsers}
              iconBg="#dcfce7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
            <StatCard
              label="Active Sessions"
              value="—"
              iconBg="#ede9fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            <StatCard
              label="API Calls"
              value="—"
              iconBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              }
            />
          </Row>

          <Row className="g-3">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Logins Over Time (last 14 days)</h2>
                  <ExamsTrendChart data={trend} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <NotConnectedCard title="Storage Used" />
            </Col>
          </Row>
        </>
      )}
    </PlatformLayout>
  );
}
