import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { listAllSubmissions } from '../../api/submissionApi';
import type { AttemptStatus, PlatformSubmissionResponse } from '../../types/submission';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_VARIANT: Record<AttemptStatus, string> = {
  InProgress: 'info',
  Submitted: 'success',
  AutoSubmitted: 'warning',
};

const STATUS_LABEL: Record<AttemptStatus, string> = {
  InProgress: 'In Progress',
  Submitted: 'Completed',
  AutoSubmitted: 'Auto-Submitted',
};

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
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

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function formatDuration(startedAtUtc: string, submittedAtUtc: string | null): string {
  if (!submittedAtUtc) return '—';
  const ms = new Date(submittedAtUtc).getTime() - new Date(startedAtUtc).getTime();
  if (ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function exportSubmissionsToCsv(
  rows: PlatformSubmissionResponse[],
  examTitleById: Map<string, string>,
  tenantNameById: Map<string, string>,
) {
  const header = ['Student', 'Email', 'Exam', 'Organization', 'Status', 'Started At', 'Submitted At', 'Time Taken'];
  const csvRows = rows.map((s) => [
    s.studentName ?? '',
    s.studentEmail ?? '',
    examTitleById.get(s.examId) ?? '',
    tenantNameById.get(s.tenantId) ?? '',
    STATUS_LABEL[s.status],
    new Date(s.startedAtUtc).toISOString(),
    s.submittedAtUtc ? new Date(s.submittedAtUtc).toISOString() : '',
    formatDuration(s.startedAtUtc, s.submittedAtUtc),
  ]);
  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type StatusFilter = 'all' | AttemptStatus;

// Real, cross-tenant - GET /api/submissions/all (SuperAdmin only), the
// first Super Admin endpoint this service has ever had. Deliberately has
// no Score/Percentage column and no "Not Submitted" row - scoring is
// computed live, per-exam, by Result Service (not a stored column this
// list can page/sort on), and "Not Submitted" isn't a real status: a
// student who never started an exam has no ExamAttempt row to list at
// all. This shows only real attempts that actually exist, in whatever
// state they're actually in.
export default function PlatformSubmissions() {
  const { data: submissions, isLoading, isError } = useQuery({ queryKey: ['platform-submissions'], queryFn: listAllSubmissions });
  const { data: exams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const examTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (exams ?? []).forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const totalSubmissions = (submissions ?? []).length;
  const completedCount = (submissions ?? []).filter((s) => s.status === 'Submitted').length;
  const inProgressCount = (submissions ?? []).filter((s) => s.status === 'InProgress').length;
  const autoSubmittedCount = (submissions ?? []).filter((s) => s.status === 'AutoSubmitted').length;
  const pct = (count: number) => (totalSubmissions === 0 ? '0' : ((count / totalSubmissions) * 100).toFixed(1));

  const searchQuery = searchText.trim().toLowerCase();

  const filteredSubmissions = useMemo(() => {
    return (submissions ?? []).filter((s) => {
      if (organizationFilter !== 'all' && s.tenantId !== organizationFilter) return false;
      if (examFilter !== 'all' && s.examId !== examFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (dateFrom && new Date(s.startedAtUtc) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.startedAtUtc) > new Date(`${dateTo}T23:59:59`)) return false;
      if (!searchQuery) return true;
      const examTitle = examTitleById.get(s.examId) ?? '';
      return (
        (s.studentName ?? '').toLowerCase().includes(searchQuery) ||
        (s.studentEmail ?? '').toLowerCase().includes(searchQuery) ||
        examTitle.toLowerCase().includes(searchQuery)
      );
    });
  }, [submissions, organizationFilter, examFilter, statusFilter, dateFrom, dateTo, searchQuery, examTitleById]);

  useEffect(() => {
    setPage(1);
  }, [organizationFilter, examFilter, statusFilter, dateFrom, dateTo, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedSubmissions = filteredSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredSubmissions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredSubmissions.length);

  return (
    <PlatformLayout active="submissions">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Submissions</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Submissions</h1>
          <p className="text-muted mb-0">View exam attempts across every organization on the platform.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={filteredSubmissions.length === 0}
          onClick={() => exportSubmissionsToCsv(filteredSubmissions, examTitleById, tenantNameById)}
        >
          Export
        </button>
      </div>

      <Row xs={2} lg={4} className="g-3 my-1">
        <Col>
          <ReportStatCard
            icon={<DocumentIcon />}
            label="Total Submissions"
            value={String(totalSubmissions)}
            caption="Across all organizations"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Completed"
            value={String(completedCount)}
            caption={`${pct(completedCount)}% of total`}
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<ClockIcon />}
            label="In Progress"
            value={String(inProgressCount)}
            caption={`${pct(inProgressCount)}% of total`}
            iconBg="#eff6ff"
            iconColor="#2563eb"
          />
        </Col>
        <Col>
          <ReportStatCard
            icon={<RefreshIcon />}
            label="Auto-Submitted"
            value={String(autoSubmittedCount)}
            caption={`${pct(autoSubmittedCount)}% of total`}
            iconBg="#fffbeb"
            iconColor="#d97706"
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm my-2">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} md={6} lg={2}>
              <Form.Label className="small fw-bold">Organization</Form.Label>
              <Form.Select size="sm" value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
                <option value="all">All Organizations</option>
                {(tenants ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold">Exam</Form.Label>
              <Form.Select size="sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
                <option value="all">All Exams</option>
                {(exams ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Label className="small fw-bold">Status</Form.Label>
              <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">All Status</option>
                <option value="Submitted">Completed</option>
                <option value="InProgress">In Progress</option>
                <option value="AutoSubmitted">Auto-Submitted</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small fw-bold">Date Range (Started)</Form.Label>
              <div className="d-flex gap-1">
                <Form.Control type="date" size="sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Form.Control type="date" size="sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </Col>
            <Col xs={12} lg={2}>
              <Form.Label className="small fw-bold">Search</Form.Label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <SearchIcon />
                </span>
                <Form.Control
                  type="search"
                  placeholder="Student, email, exam..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredSubmissions.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load submissions. Please try again.</div>}

          {!isLoading && !isError && filteredSubmissions.length === 0 && (
            <div className="text-center text-muted py-5">No submissions match your filters.</div>
          )}

          {!isLoading && !isError && filteredSubmissions.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Exam</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Started At</th>
                  <th>Submitted At</th>
                  <th className="pe-4">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {pagedSubmissions.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-4">
                      <div className="fw-medium">{s.studentName ?? '—'}</div>
                      {s.studentEmail && (
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {s.studentEmail}
                        </div>
                      )}
                    </td>
                    <td className="text-muted">{examTitleById.get(s.examId) ?? '—'}</td>
                    <td className="text-muted">{tenantNameById.get(s.tenantId) ?? '—'}</td>
                    <td>
                      <Badge bg={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {new Date(s.startedAtUtc).toLocaleString()}
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>
                      {s.submittedAtUtc ? new Date(s.submittedAtUtc).toLocaleString() : '—'}
                    </td>
                    <td className="pe-4 text-muted">{formatDuration(s.startedAtUtc, s.submittedAtUtc)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredSubmissions.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredSubmissions.length} submissions
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
    </PlatformLayout>
  );
}
