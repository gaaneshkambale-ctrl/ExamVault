import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { BookIcon, CheckCircleIcon, UserCheckIcon, TargetIcon, TrendingUpIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { computeDelta, getCalendarMonthWindows, isWithinRange } from '../../utils/dateRange';
import type { AdminAttemptResultResponse } from '../../types/result';

const statusVariant: Record<string, string> = {
  Published: 'success',
  Ongoing: 'warning',
  Processing: 'secondary',
};

const PAGE_SIZE = 8;

export default function ExamResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examIds);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  const loading = isLoadingExams || isLoadingResults || isLoadingAttempts;

  const perExamStats = useMemo(() => {
    const byExam = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of allResults) {
      const list = byExam.get(r.examId) ?? [];
      list.push(r);
      byExam.set(r.examId, list);
    }

    return (exams ?? []).map((exam) => {
      const results = byExam.get(exam.id) ?? [];
      const attempts = attemptsByExam[exam.id] ?? [];
      const candidateIds = new Set(results.map((r) => r.userId));
      const hasInProgress = attempts.some((a) => a.status === 'InProgress');
      const percentages = results.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
      const passCount = results.filter((r) => r.passed).length;
      const status = hasInProgress ? 'Ongoing' : exam.status === 'Published' ? 'Published' : 'Processing';
      return {
        exam,
        candidates: candidateIds.size,
        completed: results.length,
        averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
        passPercent: results.length === 0 ? 0 : (passCount / results.length) * 100,
        status,
      };
    });
  }, [exams, allResults, attemptsByExam]);

  const filteredExamStats = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return perExamStats;
    return perExamStats.filter(
      (s) => s.exam.title.toLowerCase().includes(term) || (s.exam.examCode ?? '').toLowerCase().includes(term),
    );
  }, [perExamStats, searchText]);

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  const kpis = useMemo(() => {
    const totalExams = exams?.length ?? 0;
    const completedExams = perExamStats.filter((s) => s.status === 'Published').length;
    const totalCandidates = new Set(allResults.map((r) => r.userId)).size;
    const percentages = allResults.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
    const passCount = allResults.filter((r) => r.passed).length;
    return {
      totalExams,
      completedExams,
      totalCandidates,
      averagePassPercent:
        perExamStats.length === 0 ? 0 : perExamStats.reduce((sum, s) => sum + s.passPercent, 0) / perExamStats.length,
      passPercentage: allResults.length === 0 ? 0 : (passCount / allResults.length) * 100,
      averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
    };
  }, [exams, perExamStats, allResults]);

  // "vs last month" deltas apply to flow metrics only (candidates attempted,
  // pass rate) - Total Exams/Completed Exams are point-in-time state counts,
  // a month-over-month comparison of a snapshot isn't a meaningful "flow"
  // the way it is for the Reports pages' adjustable-range deltas.
  const monthDelta = useMemo(() => {
    const { current, previous } = getCalendarMonthWindows();
    const currentResults = allResults.filter((r) => isWithinRange(r.submittedAtUtc, current));
    const previousResults = allResults.filter((r) => isWithinRange(r.submittedAtUtc, previous));
    const passRate = (rows: AdminAttemptResultResponse[]) =>
      rows.length === 0 ? 0 : (rows.filter((r) => r.passed).length / rows.length) * 100;
    return {
      candidates: computeDelta(
        new Set(currentResults.map((r) => r.userId)).size,
        new Set(previousResults.map((r) => r.userId)).size,
      ),
      passPercentage: computeDelta(passRate(currentResults), passRate(previousResults)),
    };
  }, [allResults]);

  const totalPages = Math.max(1, Math.ceil(filteredExamStats.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedStats = filteredExamStats.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredExamStats.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredExamStats.length);

  return (
    <AdminLayout active="Exam Results">
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Results</h1>
      <p className="text-muted mb-4">View overall results and performance of all exams.</p>

      <Row className="g-3 mb-4">
        <Col md={4} lg>
          <ReportStatCard icon={<BookIcon />} label="Total Exams" value={kpis.totalExams.toLocaleString()} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<CheckCircleIcon />} label="Completed Exams" value={kpis.completedExams.toLocaleString()} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard
            icon={<UserCheckIcon />}
            label="Total Candidates"
            value={kpis.totalCandidates.toLocaleString()}
            delta={monthDelta.candidates}
            deltaSuffix="vs last month"
          />
        </Col>
        <Col md={4} lg>
          <ReportStatCard icon={<TargetIcon />} label="Average Pass %" value={`${Math.round(kpis.averagePassPercent)}%`} />
        </Col>
        <Col md={4} lg>
          <ReportStatCard
            icon={<TrendingUpIcon />}
            label="Pass Percentage"
            value={`${Math.round(kpis.passPercentage)}%`}
            delta={monthDelta.passPercentage}
            deltaSuffix="vs last month"
          />
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search exam by name or code..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || pagedStats.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && filteredExamStats.length === 0 && (
            <div className="text-center text-muted py-5">No exams match your search.</div>
          )}

          {!loading && pagedStats.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Exam Name</th>
                  <th>Exam Code</th>
                  <th>Category</th>
                  <th>Total Candidates</th>
                  <th>Completed</th>
                  <th>Average Score</th>
                  <th>Pass %</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedStats.map((s) => (
                  <tr key={s.exam.id}>
                    <td className="ps-4 fw-medium">{s.exam.title}</td>
                    <td>{s.exam.examCode ?? '—'}</td>
                    <td>{s.exam.category}</td>
                    <td>{s.candidates}</td>
                    <td>{s.completed}</td>
                    <td>{Math.round(s.averageScore)}%</td>
                    <td>{Math.round(s.passPercent)}%</td>
                    <td>
                      <Badge bg={statusVariant[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="pe-4">
                      <Link
                        to={`/admin/reports/${s.exam.id}`}
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                        title="View Report"
                        aria-label="View report"
                      >
                        <ViewIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
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
        totalCount={filteredExamStats.length}
        onPageChange={setPage}
      />
    </AdminLayout>
  );
}
