import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import BarLineComboChart from '../../components/charts/BarLineComboChart';
import DonutChart from '../../components/charts/DonutChart';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { BookIcon, CheckCircleIcon, UserCheckIcon, TargetIcon } from '../../components/reports/ReportIcons';
import { useExams, useExamTypes } from '../../hooks/useExams';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { ExamStatus } from '../../types/exam';
import { getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AdminAttemptResultResponse } from '../../types/result';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

const DONUT_COLORS = ['#4f46e5', '#22c55e', '#3b82f6', '#f97316', '#14b8a6', '#ec4899', '#eab308', '#6b7280'];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ExamTypeWiseReport() {
  const { data: exams } = useExams();
  const { data: examTypes } = useExamTypes();
  const { data: allResults, isLoading } = useAdminResultsForAllExams(exams);

  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState<'All' | ExamStatus>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const filteredExams = useMemo(
    () =>
      (exams ?? []).filter(
        (e) => (category === 'All' || e.category === category) && (status === 'All' || e.status === status),
      ),
    [exams, category, status],
  );

  const rows = useMemo(() => {
    const resultsByExamId = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of allResults ?? []) {
      if (!isWithinRange(r.submittedAtUtc, range)) continue;
      const list = resultsByExamId.get(r.examId) ?? [];
      list.push(r);
      resultsByExamId.set(r.examId, list);
    }

    return (examTypes ?? []).map((type) => {
      const examsOfType = filteredExams.filter((e) => e.examTypeId === type.id);
      const results = examsOfType.flatMap((e) => resultsByExamId.get(e.id) ?? []);
      const percentages = results.map(percentOf);
      const passCount = results.filter((r) => r.passed).length;
      return {
        type,
        examsCount: examsOfType.length,
        participantsCount: results.length,
        averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
        passPercentage: results.length === 0 ? 0 : (passCount / results.length) * 100,
        topScore: percentages.length === 0 ? 0 : Math.max(...percentages),
        lowestScore: percentages.length === 0 ? 0 : Math.min(...percentages),
      };
    });
  }, [examTypes, filteredExams, allResults, range]);

  const totalParticipants = useMemo(() => rows.reduce((sum, r) => sum + r.participantsCount, 0), [rows]);
  const overallAverageScore = useMemo(() => {
    const allInRangeResults = rows.length === 0 ? [] : (allResults ?? []).filter((r) => isWithinRange(r.submittedAtUtc, range));
    const filteredExamIds = new Set(filteredExams.map((e) => e.id));
    const percentages = allInRangeResults.filter((r) => filteredExamIds.has(r.examId)).map(percentOf);
    return percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length;
  }, [rows, allResults, range, filteredExams]);

  useEffect(() => {
    setPage(1);
  }, [category, status, range, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, rows.length);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <p className="text-muted small mb-1">Reports / Exam Type Wise Report</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Type Wise Report</h1>
      <p className="text-muted mb-4">Detailed performance and statistics grouped by exam type.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setCategory('All');
          setStatus('All');
        }}
        exportFilename="exam-type-wise-report"
        exportHeaders={['Exam Type', 'Total Exams', 'Total Participants', 'Average Score %', 'Pass %', 'Top Score %', 'Lowest Score %']}
        exportRows={() =>
          rows.map((r) => [
            r.type.name,
            r.examsCount,
            r.participantsCount,
            Math.round(r.averageScore),
            Math.round(r.passPercentage),
            Math.round(r.topScore),
            Math.round(r.lowestScore),
          ])
        }
      >
        <Col xs="auto">
          <Form.Select size="sm" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="All">All Categories</option>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={status} onChange={(e) => setStatus(e.target.value as 'All' | ExamStatus)} style={{ maxWidth: 160 }}>
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </Form.Select>
        </Col>
      </ReportFilters>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (
        <>
          <Row className="g-3 mb-4">
            <Col md={6} lg={3}>
              <ReportStatCard icon={<BookIcon />} label="Total Exam Types" value={String((examTypes ?? []).length)} caption="Active exam types" />
            </Col>
            <Col md={6} lg={3}>
              <ReportStatCard icon={<CheckCircleIcon />} label="Total Exams" value={String(filteredExams.length)} caption="Across all types" />
            </Col>
            <Col md={6} lg={3}>
              <ReportStatCard icon={<UserCheckIcon />} label="Total Participants" value={totalParticipants.toLocaleString()} caption="Across all types" />
            </Col>
            <Col md={6} lg={3}>
              <ReportStatCard
                icon={<TargetIcon />}
                label="Average Score"
                value={`${overallAverageScore.toFixed(2)}%`}
                caption="Across all types"
                iconBg="#fff7ed"
                iconColor="#f59e0b"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Exams and Participants by Exam Type</h2>
                  <BarLineComboChart
                    labels={rows.map((r) => r.type.name.replace(' Exam', ''))}
                    bars={{ name: 'Exams', color: '#4f46e5', data: rows.map((r) => r.examsCount) }}
                    line={{ name: 'Participants', color: '#22c55e', data: rows.map((r) => r.participantsCount) }}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Participants Distribution by Exam Type</h2>
                  <DonutChart
                    data={rows
                      .filter((r) => r.participantsCount > 0)
                      .map((r, i) => ({ label: r.type.name, value: r.participantsCount, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
                    centerLabel="Total"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <h2 className="h6 fw-bold p-3 pb-2 mb-0">Exam Type Wise Performance Summary</h2>
              {rows.length === 0 ? (
                <div className="text-center text-muted py-5">No exam types match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">#</th>
                      <th>Exam Type</th>
                      <th>Total Exams</th>
                      <th>Total Participants</th>
                      <th>Average Score</th>
                      <th>Pass Percentage</th>
                      <th>Top Score</th>
                      <th>Lowest Score</th>
                      <th className="pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r, i) => (
                      <tr key={r.type.id}>
                        <td className="ps-4">{(currentPage - 1) * pageSize + i + 1}</td>
                        <td className="fw-medium">{r.type.name}</td>
                        <td>{r.examsCount}</td>
                        <td>{r.participantsCount.toLocaleString()}</td>
                        <td>{Math.round(r.averageScore)}%</td>
                        <td>{Math.round(r.passPercentage)}%</td>
                        <td>{Math.round(r.topScore)}%</td>
                        <td>{Math.round(r.lowestScore)}%</td>
                        <td className="pe-4">
                          <Link
                            to="/admin/reports/exams"
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View exam reports"
                            aria-label="View exam reports"
                          >
                            <ViewIcon />
                          </Link>
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
