import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Dropdown, Form, InputGroup, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import { BookIcon, CheckCircleIcon } from '../../components/reports/ReportIcons';
import { useTenants } from '../../hooks/useTenants';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { listExams } from '../../api/examApi';
import type { ExamResponse, ExamStatus } from '../../types/exam';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="5" rx="1" />
      <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" /><line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
}

function exportExamsToCsv(exams: ExamResponse[], tenantNameById: Map<string, string>, questionCounts: Record<string, number>) {
  const header = ['Title', 'Organization', 'Category', 'Status', 'Questions', 'Created On'];
  const rows = exams.map((e) => [
    e.title,
    tenantNameById.get(e.tenantId) ?? '',
    e.category || '',
    e.status,
    String(questionCounts[e.id] ?? e.totalQuestions),
    new Date(e.createdOn).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-exams-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type StatusFilter = 'all' | ExamStatus;

// Real, cross-tenant - ExamsController.List already accepts a SuperAdmin
// caller (widened for the Exam Usage report), same query key as that page
// so React Query dedupes the fetch instead of hitting it twice.
export default function PlatformAllExams() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();
  // exam.totalQuestions is a legacy field never kept in sync with Question
  // Service (see useQuestions.ts) - compute the real count like every other
  // exam list in the app already does.
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));

  const [searchText, setSearchText] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  // Organization scope drives the stat cards; status filter and search
  // layer on top of that for the table, same order AllUsers.tsx uses.
  const orgScopedExams = useMemo(
    () => (organizationFilter === 'all' ? (exams ?? []) : (exams ?? []).filter((e) => e.tenantId === organizationFilter)),
    [exams, organizationFilter],
  );

  const totalExams = orgScopedExams.length;
  const publishedCount = orgScopedExams.filter((e) => e.status === 'Published').length;
  const draftCount = orgScopedExams.filter((e) => e.status === 'Draft').length;
  const archivedCount = orgScopedExams.filter((e) => e.status === 'Archived').length;
  const pct = (count: number) => (totalExams === 0 ? '0' : ((count / totalExams) * 100).toFixed(2));

  const searchQuery = searchText.trim().toLowerCase();
  const filteredExams = orgScopedExams.filter((exam) => {
    if (statusFilter !== 'all' && exam.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(exam.tenantId) ?? '';
    return (
      exam.title.toLowerCase().includes(searchQuery) ||
      exam.category.toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  return (
    <PlatformLayout active="exams-all">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / All Exams</p>
          <h1 className="h4 fw-bold mb-1 text-primary">All Exams</h1>
          <p className="text-muted mb-0">Every exam across every organization on the platform.</p>
        </div>
        <div className="d-flex gap-2">
          <InputGroup style={{ width: 260 }}>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search exams, category, organization..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
          <Dropdown>
            <Dropdown.Toggle
              as="button"
              bsPrefix="btn"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            >
              <FilterIcon /> Filters
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All Statuses
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'Published'} onClick={() => setStatusFilter('Published')}>
                Published
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'Draft'} onClick={() => setStatusFilter('Draft')}>
                Draft
              </Dropdown.Item>
              <Dropdown.Item active={statusFilter === 'Archived'} onClick={() => setStatusFilter('Archived')}>
                Archived
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button
            variant="outline-primary"
            disabled={filteredExams.length === 0}
            onClick={() => exportExamsToCsv(filteredExams, tenantNameById, questionCounts)}
          >
            Export
          </Button>
        </div>
      </div>

      <Form.Group className="mb-3" controlId="allExamsOrgFilter" style={{ maxWidth: 320 }}>
        <Form.Label className="small fw-bold">Organization</Form.Label>
        <Form.Select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
          <option value="all">All Organizations</option>
          {(tenants ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Row className="g-3 mb-3">
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={String(totalExams)}
            caption="Across selected organizations"
            iconBg="#eef2ff"
            iconColor="#4f46e5"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Published"
            value={String(publishedCount)}
            caption={`${pct(publishedCount)}% of total`}
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<DocumentIcon />}
            label="Draft"
            value={String(draftCount)}
            caption={`${pct(draftCount)}% of total`}
            iconBg="#fff7ed"
            iconColor="#d97706"
          />
        </Col>
        <Col xs={6} md={3}>
          <ReportStatCard
            icon={<ArchiveIcon />}
            label="Archived"
            value={String(archivedCount)}
            caption={`${pct(archivedCount)}% of total`}
            iconBg="#f3f4f6"
            iconColor="#4b5563"
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredExams.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

          {!isLoading && !isError && filteredExams.length === 0 && (
            <div className="text-center text-muted py-5">No exams match your search.</div>
          )}

          {!isLoading && !isError && filteredExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam</th>
                  <th>Organization</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Created On</th>
                  <th className="pe-4">Created By</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
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
                    <td className="text-muted">{exam.category || '—'}</td>
                    <td>
                      <Badge
                        bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}
                      >
                        {exam.status}
                      </Badge>
                    </td>
                    <td className="text-muted">{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                    <td>{new Date(exam.createdOn).toLocaleDateString()}</td>
                    <td className="pe-4 text-muted">{exam.createdByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
