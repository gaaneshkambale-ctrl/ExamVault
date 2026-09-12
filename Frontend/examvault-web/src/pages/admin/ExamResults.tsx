import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Dropdown, Form, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import TablePagination from '../../components/reports/TablePagination';
import LineTrendChart from '../../components/charts/LineTrendChart';
import DonutChart from '../../components/charts/DonutChart';
import { ViewIcon, DownloadIcon, BarChartIcon, UsersIcon } from '../../components/icons/ActionIcons';
import {
  BookIcon,
  CheckCircleIcon,
  TargetIcon,
  TrendingUpIcon,
  ActivityIcon,
} from '../../components/reports/ReportIcons';
import { useExams, useExamTypes } from '../../hooks/useExams';
import { useStudents } from '../../hooks/useUsers';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { computeDelta, getCalendarMonthWindows, getDefaultRange, bucketByDay, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import { generateExamResultsBooklet, isQuestionCorrect, isSkipped } from '../../utils/generateResultPdf';
import { computeSectionStats } from '../../utils/sectionStats';
import { listSections } from '../../api/sectionApi';
import { listQuestions } from '../../api/questionApi';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { AdminAttemptResultResponse } from '../../types/result';

const VIOLATION_COUNT_FIELDS: (keyof AdminAttemptResultResponse)[] = [
  'fullscreenExitCount',
  'noFaceDetectedCount',
  'multipleFacesDetectedCount',
  'tabSwitchCount',
  'multipleTabsCount',
  'copyPasteCount',
  'rightClickCount',
  'multipleMonitorsCount',
];

// Same heuristic as StudentResults.tsx/StudentResultDetails.tsx - no backend-computed
// integrity score exists, this derives one from the same violation counts shown on
// Security Violations/Live Monitoring (5 points off per flagged violation, floored at 0).
function integrityScore(result: AdminAttemptResultResponse): number {
  const totalViolations = VIOLATION_COUNT_FIELDS.reduce((sum, field) => sum + (result[field] as number), 0);
  return Math.max(0, 100 - totalViolations * 5);
}

const statusVariant: Record<string, string> = {
  Published: 'success',
  Ongoing: 'warning',
  Processing: 'secondary',
};

const PAGE_SIZE_OPTIONS = [8, 25, 50];
const TOP_EXAMS_COUNT = 5;
const EMPTY_RANGE: DateRange = { from: '', to: '' };

function passRateVariant(pct: number): string {
  if (pct >= 80) return 'success';
  if (pct >= 60) return 'warning';
  return 'danger';
}

function KebabIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export default function ExamResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: examTypes } = useExamTypes();
  const { data: users } = useStudents();
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examIds);

  const [searchText, setSearchText] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<DateRange>(EMPTY_RANGE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  // 7 days, not the shared 30-day default - checked the real submission data
  // (SubmissionDb.ExamAttempts) and every attempt in this environment was
  // submitted within a single 4-day window, so a 30-day chart renders as an
  // almost-flat line with a barely-visible blip near the end.
  const [trendRange, setTrendRange] = useState<DateRange>(() => getDefaultRange(7));
  const [trendCategory, setTrendCategory] = useState('All');

  const loading = isLoadingExams || isLoadingResults || isLoadingAttempts;

  const studentById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string }>();
    for (const user of users ?? []) map.set(user.id, { fullName: user.fullName, email: user.email });
    return map;
  }, [users]);

  const resultsByExamId = useMemo(() => {
    const map = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of allResults) {
      const list = map.get(r.examId) ?? [];
      list.push(r);
      map.set(r.examId, list);
    }
    return map;
  }, [allResults]);

  const perExamStats = useMemo(
    () =>
      (exams ?? []).map((exam) => {
        const results = resultsByExamId.get(exam.id) ?? [];
        const attempts = attemptsByExam[exam.id] ?? [];
        const candidateIds = new Set(results.map((r) => r.userId));
        const hasInProgress = attempts.some((a) => a.status === 'InProgress');
        const percentages = results.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
        const passCount = results.filter((r) => r.passed).length;
        const failCount = results.length - passCount;
        const status = hasInProgress ? 'Ongoing' : exam.status === 'Published' ? 'Published' : 'Processing';
        const totalAttempts = attempts.length;
        return {
          exam,
          candidates: candidateIds.size,
          completed: results.length,
          totalAttempts,
          passCount,
          failCount,
          completionRate: totalAttempts === 0 ? 0 : (results.length / totalAttempts) * 100,
          averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
          passPercent: results.length === 0 ? 0 : (passCount / results.length) * 100,
          status,
        };
      }),
    [exams, resultsByExamId, attemptsByExam],
  );

  const filteredExamStats = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return perExamStats.filter((s) => {
      if (term && !(s.exam.title.toLowerCase().includes(term) || (s.exam.examCode ?? '').toLowerCase().includes(term))) {
        return false;
      }
      if (examTypeFilter !== 'All' && s.exam.examTypeName !== examTypeFilter) return false;
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      // Most exams here have no scheduled start (they're not calendar-booked exams),
      // so the displayed/filtered "Exam Date" falls back to when the exam was created -
      // matches the table cell, which uses the same fallback.
      const examDate = (s.exam.startAtUtc ?? s.exam.createdOn).slice(0, 10);
      if (dateFilter.from && examDate < dateFilter.from) return false;
      if (dateFilter.to && examDate > dateFilter.to) return false;
      return true;
    });
  }, [perExamStats, searchText, examTypeFilter, statusFilter, dateFilter]);

  const topExamsByPassRate = useMemo(
    () =>
      perExamStats
        .filter((s) => s.completed > 0)
        .sort((a, b) => b.passPercent - a.passPercent)
        .slice(0, TOP_EXAMS_COUNT),
    [perExamStats],
  );

  // No PublishedAt timestamp exists anywhere in the data model (ExamResponse.showResult
  // is just a boolean) - this uses each exam's real latest-submission time instead of
  // fabricating a publish event, restricted to exams actually marked visible to students.
  const recentCompletedExams = useMemo(
    () =>
      (exams ?? [])
        .flatMap((exam) => {
          const results = resultsByExamId.get(exam.id) ?? [];
          if (!exam.showResult || results.length === 0) return [];
          const latest = results.reduce((max, r) => (new Date(r.submittedAtUtc) > new Date(max.submittedAtUtc) ? r : max));
          return [{ exam, completedOn: latest.submittedAtUtc }];
        })
        .sort((a, b) => new Date(b.completedOn).getTime() - new Date(a.completedOn).getTime())
        .slice(0, TOP_EXAMS_COUNT),
    [exams, resultsByExamId],
  );

  const passFailDistribution = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const r of allResults) {
      if (r.hasPendingGrading) pending += 1;
      else if (r.passed) passed += 1;
      else failed += 1;
    }
    return { passed, failed, pending, total: allResults.length };
  }, [allResults]);

  useEffect(() => {
    setPage(1);
  }, [searchText, examTypeFilter, statusFilter, dateFilter]);

  const kpis = useMemo(() => {
    const totalExams = perExamStats.length;
    const completedExams = perExamStats.filter((s) => s.completed > 0).length;
    const totalStudents = new Set(allResults.map((r) => r.userId)).size;
    return {
      totalExams,
      completedExams,
      completionPercent: totalExams === 0 ? 0 : (completedExams / totalExams) * 100,
      totalStudents,
      averagePassPercent:
        perExamStats.length === 0 ? 0 : perExamStats.reduce((sum, s) => sum + s.passPercent, 0) / perExamStats.length,
    };
  }, [perExamStats, allResults]);

  // "vs last month" deltas apply to flow metrics only - point-in-time state
  // counts (completion %, total students) aren't a meaningful month-over-
  // month comparison the way a flow count is.
  const monthDelta = useMemo(() => {
    const { current, previous } = getCalendarMonthWindows();
    const currentResults = allResults.filter((r) => isWithinRange(r.submittedAtUtc, current));
    const previousResults = allResults.filter((r) => isWithinRange(r.submittedAtUtc, previous));
    const passPct = (list: AdminAttemptResultResponse[]) =>
      list.length === 0 ? 0 : (list.filter((r) => r.passed).length / list.length) * 100;
    const currentExams = (exams ?? []).filter((e) => isWithinRange(e.createdOn, current));
    const previousExams = (exams ?? []).filter((e) => isWithinRange(e.createdOn, previous));
    return {
      submissions: computeDelta(currentResults.length, previousResults.length),
      examsCreated: computeDelta(currentExams.length, previousExams.length),
      passPercent: computeDelta(Math.round(passPct(currentResults)), Math.round(passPct(previousResults))),
    };
  }, [allResults, exams]);

  const examCategoryById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams ?? []) {
      map.set(exam.id, exam.category);
    }
    return map;
  }, [exams]);

  const trendResults = useMemo(
    () =>
      allResults.filter(
        (r) =>
          isWithinRange(r.submittedAtUtc, trendRange) &&
          (trendCategory === 'All' || examCategoryById.get(r.examId) === trendCategory),
      ),
    [allResults, trendRange, trendCategory, examCategoryById],
  );

  const trendBuckets = useMemo(() => bucketByDay(trendResults.map((r) => r.submittedAtUtc), trendRange), [
    trendResults,
    trendRange,
  ]);

  // One combined PDF booklet for the whole exam - one full "Exam Result Report" (both
  // pages) per student, reusing the exact same generateResultPdf drawing code as the
  // per-student download so this never visually drifts from that. Sections/questions
  // are fetched once for the exam (not per student); rank/average-accuracy are computed
  // once across every student who attempted it.
  const handleDownloadExamPdf = async (examId: string, examTitle: string) => {
    const results = resultsByExamId.get(examId) ?? [];
    if (results.length === 0) return;
    const exam = (exams ?? []).find((e) => e.id === examId);

    let sectionNameById = new Map<string, string>();
    let sectionIdByQuestionId = new Map<string, string | null>();
    try {
      const [sections, examQuestions] = await Promise.all([listSections(examId), listQuestions(examId)]);
      sectionNameById = new Map(sections.map((s) => [s.id, s.name]));
      sectionIdByQuestionId = new Map(examQuestions.map((q) => [q.id, q.sectionId]));
    } catch {
      // Falls back to generateResultPdf's own "Overall" bucket per student below.
    }

    const accuracyOf = (r: AdminAttemptResultResponse) => {
      const attempted = r.questions.filter((q) => !isSkipped(q));
      const correct = attempted.filter((q) => isQuestionCorrect(q)).length;
      return attempted.length > 0 ? (correct / attempted.length) * 100 : 0;
    };
    const byScoreDesc = [...results].sort((a, b) => b.totalScore - a.totalScore);
    const averageAccuracyPercent = Math.round(results.reduce((sum, r) => sum + accuracyOf(r), 0) / results.length);
    const attemptStartById = new Map((attemptsByExam[examId] ?? []).map((a) => [a.id, a.startedAtUtc]));

    const entries = results.map((result) => {
      const student = studentById.get(result.userId);
      const sectionStats =
        sectionNameById.size > 0 ? computeSectionStats(result.questions, sectionIdByQuestionId, sectionNameById) : undefined;
      return {
        result,
        context: {
          studentName: student?.fullName,
          studentEmail: student?.email,
          examCode: exam?.examCode ?? null,
          examType: exam?.examTypeName ?? exam?.category ?? null,
          durationMinutes: exam?.durationMinutes,
          attemptStartedAtUtc: attemptStartById.get(result.attemptId) ?? null,
          integrityScorePercent: integrityScore(result),
          sectionStats,
          rank: byScoreDesc.findIndex((r) => r.attemptId === result.attemptId) + 1,
          totalParticipants: results.length,
          averageAccuracyPercent,
        },
      };
    });

    await generateExamResultsBooklet(examTitle, entries);
  };

  const totalPages = Math.max(1, Math.ceil(filteredExamStats.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedStats = filteredExamStats.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredExamStats.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredExamStats.length);

  return (
    <RoleAwareLayout active="Exam Results">
      <div className="text-muted small mb-2">Results / Exam Results</div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Exam Results</h1>
          <p className="text-muted mb-0">View and manage results for all exams.</p>
        </div>
        <Link to="/admin/exams/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
          + Create Exam
        </Link>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<BookIcon />}
            label="Total Exams"
            value={kpis.totalExams.toLocaleString()}
            delta={monthDelta.examsCreated}
            deltaSuffix="vs last month"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Completed Exams"
            value={kpis.completedExams.toLocaleString()}
            caption={`${Math.round(kpis.completionPercent)}% completion`}
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<TargetIcon />}
            label="Average Pass Rate"
            value={`${Math.round(kpis.averagePassPercent)}%`}
            delta={monthDelta.passPercent}
            deltaSuffix="vs last month"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<UsersIcon />}
            label="Total Students"
            value={kpis.totalStudents.toLocaleString()}
            caption="Across all exams"
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-center">
            <Col md={4}>
              <Form.Control
                type="search"
                placeholder="Search exam title or code..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)}>
                <option value="All">All Exam Types</option>
                {(examTypes ?? [])
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Processing">Processing</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="d-flex align-items-center gap-1">
                <Form.Control
                  type="date"
                  size="sm"
                  value={dateFilter.from}
                  max={dateFilter.to || undefined}
                  onChange={(e) => setDateFilter((r) => ({ ...r, from: e.target.value }))}
                />
                <span className="text-muted small">to</span>
                <Form.Control
                  type="date"
                  size="sm"
                  value={dateFilter.to}
                  min={dateFilter.from || undefined}
                  onChange={(e) => setDateFilter((r) => ({ ...r, to: e.target.value }))}
                />
              </div>
            </Col>
            <Col md={1}>
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchText('');
                  setExamTypeFilter('All');
                  setStatusFilter('All');
                  setDateFilter(EMPTY_RANGE);
                }}
              >
                Reset
              </button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className={loading || pagedStats.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && filteredExamStats.length === 0 && (
            <div className="text-center text-muted py-5">No exams match your filters.</div>
          )}

          {!loading && pagedStats.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">#</th>
                  <th>Exam Title</th>
                  <th>Exam Code</th>
                  <th>Exam Type</th>
                  <th>Exam Date</th>
                  <th>Duration</th>
                  <th>Total Students</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass Rate</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedStats.map((s, i) => (
                  <tr key={s.exam.id}>
                    <td className="ps-4 text-muted">{rangeStart + i}</td>
                    <td className="fw-medium">{s.exam.title}</td>
                    <td>{s.exam.examCode ?? '—'}</td>
                    <td>{s.exam.examTypeName ?? s.exam.category}</td>
                    <td>{new Date(s.exam.startAtUtc ?? s.exam.createdOn).toLocaleDateString()}</td>
                    <td>{s.exam.durationMinutes} min</td>
                    <td>{s.candidates}</td>
                    <td className="text-success">{s.passCount}</td>
                    <td className="text-danger">{s.failCount}</td>
                    <td className={`fw-semibold text-${passRateVariant(s.passPercent)}`}>{Math.round(s.passPercent)}%</td>
                    <td>
                      <Badge bg={statusVariant[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="pe-4">
                      <div className="d-flex gap-1">
                        <Link
                          to={`/admin/reports/${s.exam.id}/advance`}
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Advanced Report"
                          aria-label={`Advanced report for ${s.exam.title}`}
                        >
                          <BarChartIcon />
                        </Link>
                        <Link
                          to={`/admin/reports/${s.exam.id}`}
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="View Report"
                          aria-label={`View report for ${s.exam.title}`}
                        >
                          <ViewIcon />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Download all results as PDF"
                          aria-label={`Download all results for ${s.exam.title} as PDF`}
                          onClick={() => handleDownloadExamPdf(s.exam.id, s.exam.title)}
                        >
                          <DownloadIcon />
                        </button>
                        <Dropdown>
                          <Dropdown.Toggle
                            as="button"
                            bsPrefix="btn"
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            aria-label={`More actions for ${s.exam.title}`}
                          >
                            <KebabIcon />
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            <Dropdown.Item as={Link} to={`/admin/exams/${s.exam.id}/edit`}>
                              Edit Exam
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} to="/admin/results/publish">
                              Publish Results
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
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
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
      />

      <Card className="border-0 shadow-sm my-4">
        <Card.Body>
          <SectionHeader
            icon={<span className="text-primary d-flex"><TrendingUpIcon /></span>}
            title="Attempts & Participation Over Time"
            subtitle="Daily exam submissions across the selected period."
          />
          <ReportFilters
            range={trendRange}
            onRangeChange={setTrendRange}
            onReset={() => {
              setTrendRange(getDefaultRange(7));
              setTrendCategory('All');
            }}
            exportFilename="exam-attempts-over-time"
            exportHeaders={['Date', 'Submissions']}
            exportRows={() => trendBuckets.map((b) => [b.label, b.count])}
          >
            <Col xs="auto">
              <Form.Select size="sm" value={trendCategory} onChange={(e) => setTrendCategory(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="All">All Categories</option>
                {EXAM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </ReportFilters>
          <LineTrendChart
            series={[
              {
                name: 'Submissions',
                color: '#4f46e5',
                data: trendBuckets.map((b) => ({ label: b.label, value: b.count })),
              },
            ]}
          />
        </Card.Body>
      </Card>

      <Row className="g-3">
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <SectionHeader
                icon={<span className="text-primary d-flex"><ActivityIcon /></span>}
                title="Pass/Fail Distribution"
              />
              <DonutChart
                centerLabel="Total Submissions"
                data={[
                  { label: 'Passed', value: passFailDistribution.passed, color: '#16a34a' },
                  { label: 'Failed', value: passFailDistribution.failed, color: '#dc2626' },
                  { label: 'Pending', value: passFailDistribution.pending, color: '#94a3b8' },
                ]}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <SectionHeader
                icon={<span className="text-primary d-flex"><TargetIcon /></span>}
                title="Top Performing Exams"
              />
              {topExamsByPassRate.length === 0 ? (
                <div className="text-muted small text-center py-4">No completed exams yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {topExamsByPassRate.map((s) => (
                    <div key={s.exam.id}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="fw-medium">{s.exam.title}</span>
                        <span className="text-muted">{Math.round(s.passPercent)}%</span>
                      </div>
                      <ProgressBar now={s.passPercent} variant={passRateVariant(s.passPercent)} style={{ height: 8 }} />
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <SectionHeader
                icon={<span className="text-primary d-flex"><CheckCircleIcon /></span>}
                title="Recently Completed Exams"
                action={
                  <Link to="/admin/results/publish" className="small text-decoration-none">
                    View All
                  </Link>
                }
              />
              {recentCompletedExams.length === 0 ? (
                <div className="text-muted small text-center py-4">No published results yet.</div>
              ) : (
                <Table size="sm" borderless className="mb-0">
                  <thead className="text-muted small text-uppercase">
                    <tr>
                      <th>Exam Title</th>
                      <th className="text-end">Completed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompletedExams.map(({ exam, completedOn }) => (
                      <tr key={exam.id}>
                        <td className="small">{exam.title}</td>
                        <td className="text-end small text-muted">{new Date(completedOn).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </RoleAwareLayout>
  );
}
