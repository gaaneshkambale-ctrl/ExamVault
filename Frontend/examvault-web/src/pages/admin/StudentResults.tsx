import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon, DownloadIcon } from '../../components/icons/ActionIcons';
import { UsersIcon } from '../../components/icons/ActionIcons';
import { CheckCircleIcon, AlertTriangleIcon, TargetIcon, ArrowUpIcon, ArrowDownIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useGroups, useGroup } from '../../hooks/useGroups';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { getGrade } from '../../types/result';
import { generateResultPdf } from '../../utils/generateResultPdf';
import type { AdminAttemptResultResponse } from '../../types/result';

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

const PAGE_SIZE = 8;

export default function StudentResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: groups } = useGroups();
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All');
  const [page, setPage] = useState(1);

  const { data: groupDetail } = useGroup(batchFilter === 'All' ? undefined : batchFilter);
  const batchMemberIds = useMemo(
    () => (groupDetail ? new Set(groupDetail.memberUserIds) : null),
    [groupDetail],
  );

  const studentById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; rollNumber: string | null }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email, rollNumber: user.rollNumber });
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
    if (batchMemberIds && !batchMemberIds.has(result.userId)) {
      return false;
    }
    if (!searchText.trim()) {
      return true;
    }
    const student = studentById.get(result.userId);
    const haystack = `${result.examTitle} ${student?.fullName ?? ''} ${student?.email ?? ''} ${student?.rollNumber ?? ''}`.toLowerCase();
    return haystack.includes(searchText.trim().toLowerCase());
  });

  useEffect(() => {
    setPage(1);
  }, [searchText, examFilter, batchFilter]);

  const percentages = filteredRows.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
  const stats = {
    total: filteredRows.length,
    passed: filteredRows.filter((r) => r.passed).length,
    failed: filteredRows.filter((r) => !r.passed).length,
    average: percentages.length === 0 ? 0 : Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
    highest: percentages.length === 0 ? 0 : Math.round(Math.max(...percentages)),
    lowest: percentages.length === 0 ? 0 : Math.round(Math.min(...percentages)),
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  return (
    <AdminLayout active="Student Results">
      <h1 className="h4 fw-bold mb-1 text-primary">Student Results</h1>
      <p className="text-muted mb-4">View individual student results and performance.</p>

      <Row className="g-3 mb-4">
        <Col md={4} lg>
          <ReportStatCard icon={<UsersIcon />} label="Total Students" value={stats.total.toLocaleString()} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<CheckCircleIcon />} label="Passed Students" value={stats.passed.toLocaleString()} iconBg="#f0fdf4" iconColor="#16a34a" />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<AlertTriangleIcon />} label="Failed Students" value={stats.failed.toLocaleString()} iconBg="#fef2f2" iconColor="#dc2626" />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<TargetIcon />} label="Average Score" value={`${stats.average}%`} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<ArrowUpIcon />} label="Highest Score" value={`${stats.highest}%`} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<ArrowDownIcon />} label="Lowest Score" value={`${stats.lowest}%`} />
        </Col>
      </Row>

      <Row className="g-2 mb-3">
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
        <Col md={4}>
          <Form.Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="All">All Batches</option>
            {(groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Control
            type="search"
            placeholder="Search by student, email or roll no..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || pagedRows.length === 0 ? '' : 'p-0'}>
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

          {!loading && pagedRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Student</th>
                  <th>Roll No.</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Result</th>
                  <th>Completed On</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((result) => {
                  const percentage =
                    result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
                  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
                  const student = studentById.get(result.userId);
                  return (
                    <tr key={result.attemptId}>
                      <td className="ps-4 fw-medium">
                        {student ? student.fullName : 'Unknown Student'}
                        {student && <div className="text-muted small fw-normal">{student.email}</div>}
                      </td>
                      <td>{student?.rollNumber ?? '—'}</td>
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
                      <td className="pe-4">
                        <div className="d-flex gap-1">
                          <Link
                            to={`/admin/reports/${result.examId}`}
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View Report"
                            aria-label="View report"
                          >
                            <ViewIcon />
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Download Result PDF"
                            aria-label="Download result PDF"
                            onClick={() => generateResultPdf(result)}
                          >
                            <DownloadIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <TablePagination
        page={currentPage}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalCount={filteredRows.length}
        onPageChange={setPage}
      />
    </AdminLayout>
  );
}
