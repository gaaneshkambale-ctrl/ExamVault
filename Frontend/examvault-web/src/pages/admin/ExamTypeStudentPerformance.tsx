import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import TablePagination from '../../components/reports/TablePagination';
import { DownloadIcon } from '../../components/icons/ActionIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';
import { useUsers } from '../../hooks/useUsers';
import { exportRowsToCsv } from '../../utils/exportCsv';
import { computePercentile, computeRank, getExamResultScheme } from '../../utils/examResultScheme';
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
  const scheme = getExamResultScheme(examType?.name);

  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pass' | 'Fail'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);

  // Rank/Percentile only make sense within one exam's cohort (different
  // exams in the same type can have different max marks/difficulty), so
  // they're only computed when a specific exam is selected - not "All
  // Exams". The cohort used for ranking is every student who attempted
  // that exam, computed before the search/status filters narrow what's
  // actually displayed, so ranks stay correct regardless of what's typed
  // in the search box.
  const rows = useMemo(() => {
    const inScope = (resultsOfType ?? []).filter((r) => examFilter === 'All' || r.examId === examFilter);
    const byStudent = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of inScope) {
      const list = byStudent.get(r.userId) ?? [];
      list.push(r);
      byStudent.set(r.userId, list);
    }

    const cohort = students
      .map((student) => {
        const attempts = byStudent.get(student.id) ?? [];
        if (attempts.length === 0) return null;
        const percentages = attempts.map(percentOf);
        const passCount = attempts.filter((a) => a.passed).length;
        const lastAttempt = attempts.reduce((max, a) => (a.submittedAtUtc > max.submittedAtUtc ? a : max), attempts[0]);
        return {
          userId: student.id,
          fullName: student.fullName,
          attempts,
          averagePercent: percentages.reduce((a, b) => a + b, 0) / percentages.length,
          highestPercent: Math.max(...percentages),
          passPercent: (passCount / attempts.length) * 100,
          lastAttempt,
          lastAttemptPercent: percentOf(lastAttempt),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const canRank = scheme.showRankPercentile && examFilter !== 'All';
    const cohortScores = cohort.map((r) => r.lastAttemptPercent);

    return cohort
      .filter((r) => r.fullName.toLowerCase().includes(search.toLowerCase()))
      .filter((r) => {
        if (statusFilter === 'Pass') return r.lastAttempt.passed;
        if (statusFilter === 'Fail') return !r.lastAttempt.passed;
        return true;
      })
      .map((r) => ({
        ...r,
        rank: canRank ? computeRank(cohortScores, r.lastAttemptPercent) : null,
        percentile: canRank ? computePercentile(cohortScores, r.lastAttemptPercent) : null,
      }));
  }, [resultsOfType, students, examFilter, statusFilter, search, scheme.showRankPercentile]);

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
              {scheme.hasPassFailConcept && (
                <Col xs="auto">
                  <Form.Select
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Pass' | 'Fail')}
                    style={{ width: 140 }}
                  >
                    <option value="All">All Status</option>
                    <option value="Pass">{scheme.outcomeLabels.pass}</option>
                    <option value="Fail">{scheme.outcomeLabels.fail}</option>
                  </Form.Select>
                </Col>
              )}
              <Col xs="auto" className="ms-md-auto">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
                  onClick={() =>
                    exportRowsToCsv(
                      `exam-type-${examType?.name ?? 'unknown'}-student-performance`,
                      [
                        'Student',
                        'Total Attempts',
                        'Average Score %',
                        'Highest Score %',
                        'Last Attempt',
                        ...(scheme.showRankPercentile ? ['Rank', 'Percentile'] : []),
                        ...(scheme.hasPassFailConcept ? [`${scheme.outcomeLabels.pass} %`, 'Result'] : []),
                        ...(scheme.showCertificate ? ['Certificate'] : []),
                      ],
                      rows.map((r) => [
                        r.fullName,
                        r.attempts.length,
                        Math.round(r.averagePercent),
                        Math.round(r.highestPercent),
                        new Date(r.lastAttempt.submittedAtUtc).toLocaleDateString(),
                        ...(scheme.showRankPercentile ? [r.rank ?? '—', r.percentile !== null ? `${r.percentile}%` : '—'] : []),
                        ...(scheme.hasPassFailConcept
                          ? [Math.round(r.passPercent), r.lastAttempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail]
                          : []),
                        ...(scheme.showCertificate ? [r.lastAttempt.passed ? 'Eligible' : 'Not Eligible'] : []),
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
                <thead className="text-muted small text-uppercase bg-body-tertiary">
                  <tr>
                    <th className="ps-4">#</th>
                    <th>Student Name</th>
                    <th>Total Attempts</th>
                    <th>Average Score</th>
                    <th>Highest Score</th>
                    <th>Last Attempt</th>
                    {scheme.showRankPercentile && (
                      <>
                        <th>Rank</th>
                        <th>Percentile</th>
                      </>
                    )}
                    {scheme.hasPassFailConcept && <th>{scheme.outcomeLabels.pass} %</th>}
                    {scheme.showCertificate && <th>Certificate</th>}
                    {scheme.hasPassFailConcept && <th className="pe-4">Result</th>}
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
                      <td>{new Date(r.lastAttempt.submittedAtUtc).toLocaleDateString()}</td>
                      {scheme.showRankPercentile && (
                        <>
                          <td>{r.rank ?? '—'}</td>
                          <td>{r.percentile !== null ? `${r.percentile}%` : '—'}</td>
                        </>
                      )}
                      {scheme.hasPassFailConcept && <td>{Math.round(r.passPercent)}%</td>}
                      {scheme.showCertificate && (
                        <td>
                          <Badge bg={r.lastAttempt.passed ? 'success' : 'secondary'}>
                            {r.lastAttempt.passed ? 'Eligible' : 'Not Eligible'}
                          </Badge>
                        </td>
                      )}
                      {scheme.hasPassFailConcept && (
                        <td className="pe-4">
                          <Badge bg={r.lastAttempt.passed ? 'success' : 'danger'}>
                            {r.lastAttempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail}
                          </Badge>
                        </td>
                      )}
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
