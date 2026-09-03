import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Card, Col, Dropdown, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import SegmentDonutChart from '../../components/SegmentDonutChart';
import ReportFilters from '../../components/reports/ReportFilters';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { ExamStatus } from '../../types/exam';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type StatusFilter = 'all' | ExamStatus;

function StatCard({ icon, iconBg, label, value, caption }: { icon: ReactNode; iconBg: string; label: string; value: ReactNode; caption?: string }) {
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
            {caption && <div className="text-muted small">{caption}</div>}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
}

function NotConnectedCard({ title, note }: { title: string; note: string }) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <h2 className="h6 fw-bold mb-3">{title}</h2>
        <div className="text-center text-muted py-4">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
            style={{ width: 40, height: 40, background: '#f3f4f6', color: '#9ca3af' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8 13 13.7l-3-3L4.3 16.4" />
            </svg>
          </span>
          <div className="fw-medium">Not connected yet</div>
          <div className="small">{note}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

// Matches c.exam uses.png's Exam Usage screen. Total/Published Exams and
// Exams by Status are real (ExamsController.List already widened for a
// SuperAdmin caller). Exam Attempts/Avg Pass %/Attempts Trend stay honest
// "Not connected yet" placeholders, same as before this redesign -
// SubmissionsController has no cross-tenant attempts endpoint anywhere
// (only by-exam/{examId} and by-user/{userId}, both needing an id the
// caller doesn't have here), so there is nothing real to show without a
// genuinely new backend endpoint. The Exams Overview table below is real
// (replaces the old bare "Top Exams by Attempts" placeholder) but keeps
// its own Attempts/Avg Pass % columns honestly blank for the same reason.
export default function ExamUsageReport() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const [range, setRange] = useState<DateRange>(() => getDefaultRange(365));
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const counts = useMemo(() => {
    const list = exams ?? [];
    return {
      total: list.length,
      Draft: list.filter((e) => e.status === 'Draft').length,
      Published: list.filter((e) => e.status === 'Published').length,
      Archived: list.filter((e) => e.status === 'Archived').length,
    };
  }, [exams]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredExams = useMemo(() => {
    return (exams ?? []).filter((e) => {
      if (!isWithinRange(e.createdOn, range)) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const orgName = tenantNameById.get(e.tenantId) ?? '';
      return e.title.toLowerCase().includes(searchQuery) || orgName.toLowerCase().includes(searchQuery);
    });
  }, [exams, range, statusFilter, searchQuery, tenantNameById]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, range, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedExams = filteredExams.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredExams.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredExams.length);

  return (
    <PlatformLayout active="reports-exam-usage">
      <div className="mb-1">
        <p className="text-muted small mb-1">Platform Admin / Reports / Exam Usage</p>
        <h1 className="h4 fw-bold mb-1 text-primary">Exam Usage</h1>
        <p className="text-muted mb-0">Overview of exam creation and status across the platform.</p>
      </div>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange(365));
          setSearchText('');
          setStatusFilter('all');
        }}
        exportFilename="exam-usage-report"
        exportHeaders={['Exam', 'Organization', 'Status', 'Created On']}
        exportRows={() =>
          filteredExams.map((e) => [e.title, tenantNameById.get(e.tenantId) ?? '', e.status, new Date(e.createdOn).toISOString()])
        }
      >
        <Col xs="auto">
          <Form.Control
            type="search"
            size="sm"
            placeholder="Search exams..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm">
              {statusFilter === 'all' ? 'All Statuses' : statusFilter}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All Statuses
              </Dropdown.Item>
              {(['Published', 'Draft', 'Archived'] as const).map((s) => (
                <Dropdown.Item key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </ReportFilters>

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
              caption="All exams created"
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
              caption="Not connected yet"
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
              caption="Not connected yet"
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
              caption={counts.total === 0 ? undefined : `${((counts.Published / counts.total) * 100).toFixed(2)}% of total exams`}
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
                    {[
                      { label: 'Published', value: counts.Published, color: '#16a34a' },
                      { label: 'Draft', value: counts.Draft, color: '#d97706' },
                      { label: 'Archived', value: counts.Archived, color: '#6b7280' },
                    ].map((row) => (
                      <div key={row.label} className="d-flex justify-content-between">
                        <span>
                          <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: row.color }} />
                          {row.label}
                        </span>
                        <span>
                          {row.value} ({counts.total === 0 ? '0' : ((row.value / counts.total) * 100).toFixed(2)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <NotConnectedCard title="Exam Attempts Trend" note="Exam attempts data will appear here once the integration is available." />
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className={filteredExams.length === 0 ? '' : 'p-0'}>
              <div className="px-4 pt-3 pb-2">
                <h2 className="h6 fw-bold mb-0">Exams Overview</h2>
              </div>
              {filteredExams.length === 0 ? (
                <div className="text-center text-muted py-5">No exams match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Exam Name</th>
                      <th>Organization</th>
                      <th>Status</th>
                      <th>Created On</th>
                      <th>Attempts</th>
                      <th className="pe-4">Avg. Pass %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedExams.map((exam) => (
                      <tr key={exam.id}>
                        <td className="ps-4">
                          <div className="fw-medium">{exam.title}</div>
                          {exam.examCode && (
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {exam.examCode}
                            </div>
                          )}
                        </td>
                        <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                        <td>
                          <Badge bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}>
                            {exam.status}
                          </Badge>
                        </td>
                        <td>{new Date(exam.createdOn).toLocaleDateString()}</td>
                        <td className="text-muted">—</td>
                        <td className="pe-4 text-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {filteredExams.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {filteredExams.length} exams
              </div>
              <div className="d-flex align-items-center gap-3">
                <Pagination className="mb-0">
                  <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                      {p}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                </Pagination>
                <Form.Select size="sm" style={{ width: 100 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          )}
        </>
      )}
    </PlatformLayout>
  );
}
