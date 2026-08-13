import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import { useExams } from '../../hooks/useExams';
import { getMyResult } from '../../api/resultApi';
import type { ResultSummaryResponse } from '../../types/result';

export default function MyResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const [searchText, setSearchText] = useState('');

  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingResults = publishedExams.length > 0 && resultQueries.some((q) => q.isLoading);
  const loading = isLoadingExams || isLoadingResults;

  const rows: ResultSummaryResponse[] = resultQueries
    .map((q) => q.data)
    .filter((result): result is ResultSummaryResponse => !!result)
    .sort((a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime());

  const filteredRows = rows.filter((result) =>
    result.examTitle.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

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
    <StudentLayout active="My Results">
      <h1 className="h4 fw-bold mb-1 text-primary">My Results</h1>
      <p className="text-muted mb-4">Your scores across every exam you've completed.</p>

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
            placeholder="Search by exam..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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
            <div className="text-center text-muted py-5">
              No results yet. Submit an exam to see your score here.
            </div>
          )}

          {!loading && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No results match your search.</div>
          )}

          {!loading && filteredRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((result) => {
                  const percentage =
                    result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
                  return (
                    <tr key={result.attemptId}>
                      <td className="ps-4 fw-medium">{result.examTitle}</td>
                      <td>
                        {result.totalScore} / {result.totalMarks}
                      </td>
                      <td>{percentage}%</td>
                      <td>
                        <Badge bg={result.passed ? 'success' : 'danger'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </td>
                      <td>{new Date(result.submittedAtUtc).toLocaleString()}</td>
                      <td className="pe-4">
                        <Link to={`/results/${result.examId}`} className="btn btn-outline-secondary btn-sm">
                          View Details
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
    </StudentLayout>
  );
}
