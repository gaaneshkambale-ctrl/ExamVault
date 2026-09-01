import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import TablePagination from '../../components/reports/TablePagination';
import { DownloadIcon } from '../../components/icons/ActionIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';
import { useUsers } from '../../hooks/useUsers';
import { exportRowsToCsv } from '../../utils/exportCsv';
import type { AdminAttemptResultResponse } from '../../types/result';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ExamTypeStudentPerformance() {
  const { typeId } = useParams<{ typeId: string }>();
  const { examType, examsOfType, resultsOfType, isLoading: isLoadingType } = useExamTypeReportData(typeId);
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const loading = isLoadingType || isLoadingUsers;

  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pass' | 'Fail'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);

  const rows = useMemo(() => {
    const inScope = (resultsOfType ?? []).filter((r) => examFilter === 'All' || r.examId === examFilter);
    const byStudent = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of inScope) {
      const list = byStudent.get(r.userId) ?? [];
      list.push(r);
      byStudent.set(r.userId, list);
    }
    const result = [];
    for (const student of students) {
      const attempts = byStudent.get(student.id) ?? [];
      if (attempts.length === 0) continue;
      if (!student.fullName.toLowerCase().includes(search.toLowerCase())) continue;
      const percentages = attempts.map(percentOf);
      const passCount = attempts.filter((a) => a.passed).length;
      const lastAttempt = attempts.reduce((max, a) => (a.submittedAtUtc > max.submittedAtUtc ? a : max), attempts[0]);
      const passed = lastAttempt.passed;
      if (statusFilter === 'Pass' && !passed) continue;
      if (statusFilter === 'Fail' && passed) continue;
      result.push({
        userId: student.id,
        fullName: student.fullName,
        attempts,
        averagePercent: percentages.reduce((a, b) => a + b, 0) / percentages.length,
        highestPercent: Math.max(...percentages),
        passPercent: (passCount / attempts.length) * 100,
        lastAttempt,
      });
    }
    return result;
  }, [resultsOfType, students, examFilter, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [search, examFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, rows.length);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / Exam Type Wise Report / Student Performance</p>
          <h1 className="h4 fw-bold mb-1 text-primary">
            Student Performance{examType ? ` – ${examType.name}` : ''}
          </h1>
        </div>
        <Link to={`/admin/reports/exam-type/${typeId}`} className="btn btn-outline-secondary btn-sm">
          &larr; Back to Details
        </Link>
      </div>
      <p className="text-muted mb-4">
        Students performance summary for all {examType ? examType.name.toLowerCase() : ''} exams.
      </p>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Row className="g-2 align-items-center p-3">
              <Col xs="auto">
                <Form.Control
                  type="search"
                  size="sm"
                  placeholder="Search student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 220 }}
                />
              </Col>
              <Col xs="auto">
                <Form.Select size="sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)} style={{ width: 200 }}>
                  <option value="All">All Exams</option>
                  {examsOfType.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs="auto">
                <Form.Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Pass' | 'Fail')}
                  style={{ width: 140 }}
                >
                  <option value="All">All Status</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </Form.Select>
              </Col>
              <Col xs="auto" className="ms-md-auto">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                  onClick={() =>
                    exportRowsToCsv(
                      `exam-type-${examType?.name ?? 'unknown'}-student-performance`,
                      ['Student', 'Total Attempts', 'Average Score %', 'Highest Score %', 'Pass %', 'Last Attempt', 'Status'],
                      rows.map((r) => [
                        r.fullName,
                        r.attempts.length,
                        Math.round(r.averagePercent),
                        Math.round(r.highestPercent),
                        Math.round(r.passPercent),
                        new Date(r.lastAttempt.submittedAtUtc).toLocaleDateString(),
                        r.lastAttempt.passed ? 'Pass' : 'Fail',
                      ]),
                    )
                  }
                >
                  <DownloadIcon size={14} /> Export
                </button>
              </Col>
            </Row>

            {rows.length === 0 ? (
              <div className="text-center text-muted py-5">No student attempts match your filters.</div>
            ) : (
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>Student Name</th>
                    <th>Total Attempts</th>
                    <th>Average Score</th>
                    <th>Highest Score</th>
                    <th>Pass %</th>
                    <th>Last Attempt</th>
                    <th className="pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, i) => (
                    <tr key={r.userId}>
                      <td className="ps-4">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="fw-medium">{r.fullName}</td>
                      <td>{r.attempts.length}</td>
                      <td>{Math.round(r.averagePercent)}%</td>
                      <td>{Math.round(r.highestPercent)}%</td>
                      <td>{Math.round(r.passPercent)}%</td>
                      <td>{new Date(r.lastAttempt.submittedAtUtc).toLocaleDateString()}</td>
                      <td className="pe-4">
                        <Badge bg={r.lastAttempt.passed ? 'success' : 'danger'}>
                          {r.lastAttempt.passed ? 'Pass' : 'Fail'}
                        </Badge>
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
      )}
    </AdminLayout>
  );
}
