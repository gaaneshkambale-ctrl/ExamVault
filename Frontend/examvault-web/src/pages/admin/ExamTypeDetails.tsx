import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon, DownloadIcon } from '../../components/icons/ActionIcons';
import { BookIcon } from '../../components/reports/ReportIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';
import { exportRowsToCsv } from '../../utils/exportCsv';
import { getExamResultScheme } from '../../utils/examResultScheme';
import type { AdminAttemptResultResponse } from '../../types/result';
import type { ExamResponse } from '../../types/exam';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ExamTypeDetails() {
  const { typeId } = useParams<{ typeId: string }>();
  const { examType, examsOfType, resultsOfType, isLoading } = useExamTypeReportData(typeId);
  const scheme = getExamResultScheme(examType?.name);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | ExamResponse['status']>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const resultsByExamId = useMemo(() => {
    const map = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of resultsOfType ?? []) {
      const list = map.get(r.examId) ?? [];
      list.push(r);
      map.set(r.examId, list);
    }
    return map;
  }, [resultsOfType]);

  const rows = useMemo(() => {
    return examsOfType
      .filter((e) => (status === 'All' || e.status === status) && e.title.toLowerCase().includes(search.toLowerCase()))
      .map((exam) => {
        const results = resultsByExamId.get(exam.id) ?? [];
        const percentages = results.map(percentOf);
        const passCount = results.filter((r) => r.passed).length;
        return {
          exam,
          participants: results.length,
          averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
          passPercentage: results.length === 0 ? 0 : (passCount / results.length) * 100,
          topScore: percentages.length === 0 ? 0 : Math.max(...percentages),
        };
      });
  }, [examsOfType, resultsByExamId, status, search]);

  const totalParticipants = useMemo(() => rows.reduce((sum, r) => sum + r.participants, 0), [rows]);
  const overallAverageScore = useMemo(() => {
    const all = resultsOfType ?? [];
    const percentages = all.map(percentOf);
    return percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length;
  }, [resultsOfType]);
  const overallPassPercentage = useMemo(() => {
    const all = resultsOfType ?? [];
    if (all.length === 0) return 0;
    return (all.filter((r) => r.passed).length / all.length) * 100;
  }, [resultsOfType]);

  useEffect(() => {
    setPage(1);
  }, [search, status, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, rows.length);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / Exam Type Wise Report / Exam Type Details</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Exam Type Details</h1>
        </div>
        <Link to="/admin/reports/exam-type-wise" className="btn btn-outline-secondary btn-sm">
          &larr; Back to Overview
        </Link>
      </div>
      <p className="text-muted mb-4">Detailed list of exams under selected exam type.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && !examType && (
        <div className="text-center text-muted py-5">This exam type could not be found.</div>
      )}

      {!isLoading && examType && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="d-flex align-items-center flex-wrap gap-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{ width: 48, height: 48, background: '#eef2ff', color: '#4f46e5' }}
                >
                  <BookIcon size={22} />
                </div>
                <div>
                  <div className="h5 fw-bold mb-0">{examType.name}</div>
                  <div className="text-muted small">{examType.purpose ?? 'No description provided.'}</div>
                </div>
              </div>
              <div className="ms-md-auto d-flex flex-wrap gap-4">
                <div>
                  <div className="text-muted small">Total Exams</div>
                  <div className="h5 fw-bold mb-0">{examsOfType.length}</div>
                </div>
                <div>
                  <div className="text-muted small">Total Participants</div>
                  <div className="h5 fw-bold mb-0">{totalParticipants.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted small">Average Score</div>
                  <div className="h5 fw-bold mb-0">{overallAverageScore.toFixed(2)}%</div>
                </div>
                {scheme.hasPassFailConcept && (
                  <div>
                    <div className="text-muted small">{scheme.outcomeLabels.pass} Percentage</div>
                    <div className="h5 fw-bold mb-0">{overallPassPercentage.toFixed(2)}%</div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          <Row className="g-2 mb-3">
            <Col md={4}>
              <Link
                to={`/admin/reports/exam-type/${typeId}/performance`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between w-100"
              >
                Performance Analysis <span>&rarr;</span>
              </Link>
            </Col>
            <Col md={4}>
              <Link
                to={`/admin/reports/exam-type/${typeId}/students`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between w-100"
              >
                Student Performance <span>&rarr;</span>
              </Link>
            </Col>
            <Col md={4}>
              <Link
                to={`/admin/reports/exam-type/${typeId}/questions`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between w-100"
              >
                Question Analysis <span>&rarr;</span>
              </Link>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="d-flex flex-wrap gap-2 align-items-center p-3">
                <Form.Control
                  type="search"
                  size="sm"
                  placeholder="Search exams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 240 }}
                />
                <Form.Select
                  size="sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'All' | ExamResponse['status'])}
                  style={{ maxWidth: 160 }}
                >
                  <option value="All">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </Form.Select>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm ms-auto d-inline-flex align-items-center gap-2"
                  onClick={() =>
                    exportRowsToCsv(
                      `exam-type-${examType.name}-details`,
                      [
                        'Exam Name',
                        'Date',
                        'Participants',
                        'Average Score %',
                        ...(scheme.hasPassFailConcept ? [`${scheme.outcomeLabels.pass} %`] : []),
                        'Top Score %',
                      ],
                      rows.map((r) => [
                        r.exam.title,
                        new Date(r.exam.createdOn).toLocaleDateString(),
                        r.participants,
                        Math.round(r.averageScore),
                        ...(scheme.hasPassFailConcept ? [Math.round(r.passPercentage)] : []),
                        Math.round(r.topScore),
                      ]),
                    )
                  }
                >
                  <DownloadIcon size={14} /> Export
                </button>
              </div>

              {rows.length === 0 ? (
                <div className="text-center text-muted py-5">No exams match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">#</th>
                      <th>Exam Name</th>
                      <th>Date</th>
                      <th>Participants</th>
                      <th>Average Score</th>
                      {scheme.hasPassFailConcept && <th>{scheme.outcomeLabels.pass} %</th>}
                      <th>Top Score</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r, i) => (
                      <tr key={r.exam.id}>
                        <td className="ps-4">{(currentPage - 1) * pageSize + i + 1}</td>
                        <td className="fw-medium">{r.exam.title}</td>
                        <td>{new Date(r.exam.createdOn).toLocaleDateString()}</td>
                        <td>{r.participants.toLocaleString()}</td>
                        <td>{Math.round(r.averageScore)}%</td>
                        {scheme.hasPassFailConcept && <td>{Math.round(r.passPercentage)}%</td>}
                        <td>{Math.round(r.topScore)}%</td>
                        <td className="pe-4">
                          <div className="d-flex gap-2">
                            <Link
                              to={`/admin/reports/${r.exam.id}`}
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="View exam report"
                              aria-label="View exam report"
                            >
                              <ViewIcon />
                            </Link>
                            <Link
                              to={`/admin/reports/${r.exam.id}/advance`}
                              className="btn btn-outline-primary btn-sm"
                              title="View advanced report"
                            >
                              Advanced Report
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 px-3 pb-3">
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  totalCount={rows.length}
                  onPageChange={setPage}
                />
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Rows per page</span>
                  <Form.Select size="sm" style={{ width: 90 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
