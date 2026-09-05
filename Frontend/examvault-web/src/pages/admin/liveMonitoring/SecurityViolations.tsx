import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../../layouts/AdminLayout';
import UserAvatar from '../../../components/UserAvatar';
import { useExams } from '../../../hooks/useExams';
import { useUsers } from '../../../hooks/useUsers';
import { useViolationsByExam } from '../../../hooks/useSubmissions';
import { updateViolationStatus } from '../../../api/submissionApi';
import { severityVariant, violationDescription, violationLabel } from '../../../utils/proctoring';
import type { ViolationEventResponse, ViolationSeverity, ViolationStatus } from '../../../types/submission';

// "Live monitoring" - same polling mechanism the other Live Monitoring pages use.
const POLL_INTERVAL_MS = 15000;
const RESOLVED_WINDOW_MS = 60 * 60 * 1000;
const PAGE_SIZE = 8;

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusAction({ violation }: { violation: ViolationEventResponse }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: ViolationStatus) => updateViolationStatus(violation.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'violationsByExam'] });
    },
  });

  if (violation.status === 'Resolved') {
    return (
      <Badge bg="success-subtle" text="success-emphasis">
        Resolved
      </Badge>
    );
  }

  if (violation.status === 'UnderInvestigation') {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate('Resolved')}
      >
        {mutation.isPending ? 'Resolving...' : 'Resolve'}
      </Button>
    );
  }

  return (
    <Button variant="primary" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate('UnderInvestigation')}>
      {mutation.isPending ? 'Starting...' : 'Investigate'}
    </Button>
  );
}

export default function SecurityViolations() {
  const { data: exams, isLoading: isLoadingExams, isError: isExamsError } = useExams();
  const { data: users } = useUsers();
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | ViolationSeverity>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ViolationStatus>('All');
  const [page, setPage] = useState(1);

  const publishedExamIds = useMemo(
    () => (exams ?? []).filter((exam) => exam.status === 'Published').map((exam) => exam.id),
    [exams],
  );
  const { violationsByExam, isLoading: isLoadingViolations } = useViolationsByExam(
    publishedExamIds,
    POLL_INTERVAL_MS,
  );

  const examById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams ?? []) {
      map.set(exam.id, exam.title);
    }
    return map;
  }, [exams]);

  const userById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; hasPhoto: boolean }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email, hasPhoto: user.hasPhoto });
    }
    return map;
  }, [users]);

  const violations = publishedExamIds.flatMap((examId) => violationsByExam[examId] ?? []);

  const now = Date.now();
  const totals = {
    criticalAlerts: violations.filter((v) => v.severity === 'Critical' && v.status !== 'Resolved').length,
    activeInvestigations: violations.filter((v) => v.status === 'UnderInvestigation').length,
    resolvedLastHour: violations.filter(
      (v) => v.status === 'Resolved' && v.resolvedAtUtc && now - new Date(v.resolvedAtUtc).getTime() <= RESOLVED_WINDOW_MS,
    ).length,
  };

  const filteredViolations = violations.filter((v) => {
    if (examFilter !== 'All' && v.examId !== examFilter) {
      return false;
    }
    if (severityFilter !== 'All' && v.severity !== severityFilter) {
      return false;
    }
    if (statusFilter !== 'All' && v.status !== statusFilter) {
      return false;
    }
    const term = searchText.trim().toLowerCase();
    if (!term) {
      return true;
    }
    const user = userById.get(v.userId);
    const haystack = `${user?.fullName ?? ''} ${user?.email ?? ''}`.toLowerCase();
    return haystack.includes(term);
  });

  const sortedViolations = [...filteredViolations].sort(
    (a, b) => new Date(b.detectedAtUtc).getTime() - new Date(a.detectedAtUtc).getTime(),
  );

  useEffect(() => {
    setPage(1);
  }, [searchText, examFilter, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedViolations.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedViolations = sortedViolations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = sortedViolations.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sortedViolations.length);

  const loading = isLoadingExams || isLoadingViolations;

  return (
    <AdminLayout active="Security Violations">
      <h1 className="h4 fw-bold mb-1 text-primary">Security Violations</h1>
      <p className="text-muted mb-4">Live feed of proctoring violations across all active exams.</p>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Critical Alerts</div>
              <div className="h4 fw-bold mb-0 text-danger">{totals.criticalAlerts}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Active Investigations</div>
              <div className="h4 fw-bold mb-0">{totals.activeInvestigations}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Resolved (Last Hour)</div>
              <div className="h4 fw-bold mb-0 text-success">{totals.resolvedLastHour}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={4}>
          <Form.Control
            type="search"
            placeholder="Search violations, students..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {publishedExamIds.map((examId) => (
              <option key={examId} value={examId}>
                {examById.get(examId) ?? examId}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'All' | ViolationSeverity)}
          >
            <option value="All">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | ViolationStatus)}
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="UnderInvestigation">Under Investigation</option>
            <option value="Resolved">Resolved</option>
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || isExamsError || pagedViolations.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isExamsError && !loading && (
            <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
          )}

          {!loading && !isExamsError && violations.length === 0 && (
            <div className="text-center text-muted py-5">No security violations recorded.</div>
          )}

          {!loading && !isExamsError && violations.length > 0 && sortedViolations.length === 0 && (
            <div className="text-center text-muted py-5">No violations match your filters.</div>
          )}

          {!loading && !isExamsError && pagedViolations.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Violation Details</th>
                  <th>Severity</th>
                  <th>Time</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedViolations.map((violation) => {
                  const user = userById.get(violation.userId);
                  return (
                    <tr key={violation.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar
                            userId={violation.userId}
                            fullName={user?.fullName ?? 'Student'}
                            hasPhoto={user?.hasPhoto ?? false}
                            size={32}
                          />
                          <div>
                            <div className="fw-medium">{user?.fullName ?? 'Unknown Student'}</div>
                            <div className="text-muted small">{user?.email ?? ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={`fw-medium ${violation.severity === 'Critical' ? 'text-danger' : ''}`}>
                          {violationLabel[violation.type]}
                        </div>
                        <div className="text-muted small">{violationDescription[violation.type]}</div>
                        <div className="text-muted small">{examById.get(violation.examId) ?? ''}</div>
                      </td>
                      <td>
                        <Badge bg={severityVariant[violation.severity]}>{violation.severity.toUpperCase()}</Badge>
                      </td>
                      <td>{formatTime(violation.detectedAtUtc)}</td>
                      <td className="pe-4">
                        <StatusAction violation={violation} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!loading && !isExamsError && sortedViolations.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {sortedViolations.length} entries
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                {p}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </AdminLayout>
  );
}
