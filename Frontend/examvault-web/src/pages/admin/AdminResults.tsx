import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { getGrade } from '../../types/result';
import type { AdminAttemptResultResponse } from '../../types/result';

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

export default function AdminResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');

  const studentById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email });
    }
    return map;
  }, [users]);

  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const loading = isLoadingExams || isLoadingUsers || isLoadingResults;

  const rows: AdminAttemptResultResponse[] = [...allResults].sort(
    (a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime(),
  );

  const filteredRows = rows.filter((result) => {
    if (examFilter !== 'All' && result.examId !== examFilter) {
      return false;
    }
    if (!searchText.trim()) {
      return true;
    }
    const student = studentById.get(result.userId);
    const haystack = `${result.examTitle} ${student?.fullName ?? ''} ${student?.email ?? ''}`.toLowerCase();
    return haystack.includes(searchText.trim().toLowerCase());
  });

  const stats = {
    total: rows.length,
    passed: rows.filter((r) => r.passed).length,
    failed: rows.filter((r) => !r.passed).length,
    average:
      rows.length === 0
        ? 0
        : Math.round(
            rows.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0) /
              rows.length,
          ),
  };

  return (
    <AdminLayout active="Results">
      <h1 className="h4 fw-bold mb-1 text-primary">Results</h1>
      <p className="text-muted mb-4">Every student's score across every exam.</p>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Results</div>
              <div className="h4 fw-bold mb-0">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Passed</div>
              <div className="h4 fw-bold mb-0 text-success">{stats.passed}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Failed</div>
              <div className="h4 fw-bold mb-0 text-danger">{stats.failed}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Average Score</div>
              <div className="h4 fw-bold mb-0 text-info">{stats.total === 0 ? '—' : `${stats.average}%`}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search by student or exam..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {(exams ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || filteredRows.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center text-muted py-5">No results yet. They'll show up once students submit exams.</div>
          )}

          {!loading && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No results match your search.</div>
          )}

          {!loading && filteredRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Fullscreen Exits</th>
                  <th>Suspicious Activity</th>
                  <th>Tab/Window Activity</th>
                  <th>Copy/Paste &amp; Right-Click</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((result) => {
                  const percentage =
                    result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
                  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
                  const student = studentById.get(result.userId);
                  const suspiciousActivity = result.noFaceDetectedCount + result.multipleFacesDetectedCount;
                  const tabWindowActivity = result.tabSwitchCount + result.multipleTabsCount;
                  const copyPasteRightClick = result.copyPasteCount + result.rightClickCount;
                  return (
                    <tr key={result.attemptId}>
                      <td className="ps-4 fw-medium">
                        {student ? student.fullName : 'Unknown Student'}
                        {student && <div className="text-muted small fw-normal">{student.email}</div>}
                      </td>
                      <td>{result.examTitle}</td>
                      <td>
                        {result.totalScore} / {result.totalMarks}
                      </td>
                      <td>{percentage}%</td>
                      <td>
                        <Badge bg={gradeVariant[grade]}>{grade}</Badge>
                      </td>
                      <td>
                        <Badge bg={result.passed ? 'success' : 'danger'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </td>
                      <td>{new Date(result.submittedAtUtc).toLocaleString()}</td>
                      <td>
                        {result.fullscreenExitCount > 0 ? (
                          <Badge bg="danger">{result.fullscreenExitCount}</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {suspiciousActivity > 0 ? (
                          <Badge bg="danger">{suspiciousActivity}</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {tabWindowActivity > 0 ? (
                          <Badge bg="warning">{tabWindowActivity}</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {copyPasteRightClick > 0 ? (
                          <Badge bg="warning">{copyPasteRightClick}</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="pe-4">
                        <Link to={`/admin/reports/${result.examId}`} className="btn btn-outline-secondary btn-sm">
                          View Report
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
