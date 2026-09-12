import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import TablePagination from '../../components/reports/TablePagination';
import { ViewIcon, DownloadIcon, ShieldIcon } from '../../components/icons/ActionIcons';
import { CheckCircleIcon, AlertTriangleIcon, ActivityIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useStudents } from '../../hooks/useUsers';
import { useGroups, useGroup } from '../../hooks/useGroups';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { getGrade, type Grade } from '../../types/result';
import { violationLabel } from '../../utils/proctoring';
import { generateResultPdf, isQuestionCorrect, isSkipped } from '../../utils/generateResultPdf';
import { computeSectionStats } from '../../utils/sectionStats';
import { computeDelta, getCalendarMonthWindows, isWithinRange } from '../../utils/dateRange';
import { listSections } from '../../api/sectionApi';
import { listQuestions } from '../../api/questionApi';
import type { AdminAttemptResultResponse } from '../../types/result';
import type { ProctoringViolationType } from '../../types/submission';

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

const PAGE_SIZE_OPTIONS = [8, 25, 50];

const VIOLATION_COUNT_FIELDS: { field: keyof AdminAttemptResultResponse; type: ProctoringViolationType }[] = [
  { field: 'fullscreenExitCount', type: 'FullscreenExit' },
  { field: 'noFaceDetectedCount', type: 'NoFaceDetected' },
  { field: 'multipleFacesDetectedCount', type: 'MultipleFacesDetected' },
  { field: 'tabSwitchCount', type: 'TabSwitch' },
  { field: 'multipleTabsCount', type: 'MultipleTabs' },
  { field: 'copyPasteCount', type: 'CopyPaste' },
  { field: 'rightClickCount', type: 'RightClick' },
  { field: 'multipleMonitorsCount', type: 'MultipleMonitors' },
];

// No backend-computed "integrity score" exists yet - this is a simple,
// transparent heuristic derived from the same violation counts already
// shown on Security Violations/Live Monitoring, not a fabricated precise
// metric. 5 points off per flagged violation, floored at 0.
function integrityScore(result: AdminAttemptResultResponse): number {
  const totalViolations = VIOLATION_COUNT_FIELDS.reduce(
    (sum, { field }) => sum + (result[field] as number),
    0,
  );
  return Math.max(0, 100 - totalViolations * 5);
}

export default function StudentResults() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: users, isLoading: isLoadingUsers } = useStudents();
  const { data: groups } = useGroups();
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { attemptsByExam } = useAttemptsByExam(examIds);
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState<'All' | Grade>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Passed' | 'Failed'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [integrityTarget, setIntegrityTarget] = useState<AdminAttemptResultResponse | null>(null);

  // Submission timestamp on the result itself has no matching "started"
  // time - that only lives on the attempt record from Submission Service,
  // keyed by attemptId, so completion time needs this cross-reference.
  const attemptStartById = useMemo(() => {
    const map = new Map<string, string>();
    for (const attempts of Object.values(attemptsByExam)) {
      for (const attempt of attempts) {
        map.set(attempt.id, attempt.startedAtUtc);
      }
    }
    return map;
  }, [attemptsByExam]);

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

  const examCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams ?? []) {
      if (exam.examCode) map.set(exam.id, exam.examCode);
    }
    return map;
  }, [exams]);

  const examMetaById = useMemo(() => {
    const map = new Map<string, { examType: string; durationMinutes: number }>();
    for (const exam of exams ?? []) {
      map.set(exam.id, { examType: exam.examTypeName ?? exam.category, durationMinutes: exam.durationMinutes });
    }
    return map;
  }, [exams]);

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
    if (gradeFilter !== 'All' && getGrade(result.totalScore, result.totalMarks, result.passed) !== gradeFilter) {
      return false;
    }
    if (statusFilter !== 'All' && (statusFilter === 'Passed') !== result.passed) {
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
  }, [searchText, examFilter, batchFilter, gradeFilter, statusFilter]);

  const percentages = filteredRows.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
  const completionMinutes = filteredRows
    .map((r) => {
      const startedAtUtc = attemptStartById.get(r.attemptId);
      if (!startedAtUtc) return null;
      const minutes = (new Date(r.submittedAtUtc).getTime() - new Date(startedAtUtc).getTime()) / 60000;
      return minutes >= 0 ? minutes : null;
    })
    .filter((v): v is number => v !== null);
  const stats = {
    total: filteredRows.length,
    passed: filteredRows.filter((r) => r.passed).length,
    failed: filteredRows.filter((r) => !r.passed).length,
    average: percentages.length === 0 ? 0 : Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
    highest: percentages.length === 0 ? 0 : Math.round(Math.max(...percentages)),
    lowest: percentages.length === 0 ? 0 : Math.round(Math.min(...percentages)),
    avgCompletionMinutes:
      completionMinutes.length === 0
        ? null
        : Math.round(completionMinutes.reduce((a, b) => a + b, 0) / completionMinutes.length),
  };

  // "vs last month" is computed off the exam-filtered set only (not
  // grade/status/search) - those are point-in-time refinements of what
  // you're looking at right now, not something a month-over-month
  // comparison should track.
  const monthDelta = useMemo(() => {
    const { current, previous } = getCalendarMonthWindows();
    const examScoped = examFilter === 'All' ? rows : rows.filter((r) => r.examId === examFilter);
    const currentCount = examScoped.filter((r) => isWithinRange(r.submittedAtUtc, current)).length;
    const previousCount = examScoped.filter((r) => isWithinRange(r.submittedAtUtc, previous)).length;
    return computeDelta(currentCount, previousCount);
  }, [rows, examFilter]);

  // This list spans every exam, so section/question data for all of them isn't
  // preloaded (that would be a fetch per exam just to render the table). Fetched
  // on demand, only for the one exam actually being downloaded, so exams that do
  // have real sections (e.g. "All Language Test") show their real breakdown here
  // too, not just on the per-attempt Result Details page.
  const handleDownload = async (result: AdminAttemptResultResponse) => {
    const student = studentById.get(result.userId);
    const examMeta = examMetaById.get(result.examId);
    let sectionStats;
    try {
      const [sections, examQuestions] = await Promise.all([listSections(result.examId), listQuestions(result.examId)]);
      const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));
      const sectionIdByQuestionId = new Map(examQuestions.map((q) => [q.id, q.sectionId]));
      sectionStats = computeSectionStats(result.questions, sectionIdByQuestionId, sectionNameById);
    } catch {
      sectionStats = undefined;
    }

    // Real rank/average-accuracy across everyone who attempted this same exam -
    // `rows` already covers every exam's results, just filter down to this one.
    const examResults = rows.filter((r) => r.examId === result.examId);
    const accuracyOf = (r: AdminAttemptResultResponse) => {
      const attempted = r.questions.filter((q) => !isSkipped(q));
      const correct = attempted.filter((q) => isQuestionCorrect(q)).length;
      return attempted.length > 0 ? (correct / attempted.length) * 100 : 0;
    };
    const byScoreDesc = [...examResults].sort((a, b) => b.totalScore - a.totalScore);
    const rank = byScoreDesc.findIndex((r) => r.attemptId === result.attemptId) + 1;
    const averageAccuracyPercent =
      examResults.length > 0 ? Math.round(examResults.reduce((sum, r) => sum + accuracyOf(r), 0) / examResults.length) : undefined;

    await generateResultPdf(result, {
      studentName: student?.fullName,
      studentEmail: student?.email,
      rollNumber: student?.rollNumber,
      examCode: examCodeById.get(result.examId) ?? null,
      examType: examMeta?.examType ?? null,
      durationMinutes: examMeta?.durationMinutes,
      attemptStartedAtUtc: attemptStartById.get(result.attemptId) ?? null,
      integrityScorePercent: integrityScore(result),
      sectionStats,
      rank: rank > 0 ? rank : undefined,
      totalParticipants: examResults.length,
      averageAccuracyPercent,
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredRows.length);

  return (
    <RoleAwareLayout active="Student Results">
      <h1 className="h4 fw-bold mb-1 text-primary">Student Results</h1>
      <p className="text-muted mb-4">View individual student results and performance.</p>

      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<ActivityIcon />}
            label="Total Submissions"
            value={stats.total.toLocaleString()}
            delta={monthDelta}
            deltaSuffix="vs last month"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<CheckCircleIcon />}
            label="Passed Candidates"
            value={stats.passed.toLocaleString()}
            caption={stats.total === 0 ? undefined : `${Math.round((stats.passed / stats.total) * 100)}% passing rate`}
            iconBg="#f0fdf4"
            iconColor="#16a34a"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<AlertTriangleIcon />}
            label="Failed / Retake Required"
            value={stats.failed.toLocaleString()}
            caption={stats.total === 0 ? undefined : `${Math.round((stats.failed / stats.total) * 100)}% flagged for review`}
            iconBg="#fef2f2"
            iconColor="#dc2626"
          />
        </Col>
        <Col md={6} lg={3}>
          <ReportStatCard
            icon={<ClockIcon />}
            label="Avg Completion Time"
            value={stats.avgCompletionMinutes === null ? '—' : `${stats.avgCompletionMinutes} min`}
            caption={
              completionMinutes.length === 0
                ? 'No timed attempts yet'
                : `Based on ${completionMinutes.length.toLocaleString()} timed attempts`
            }
          />
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={12}>
          <Form.Control
            type="search"
            placeholder="Search by student name, ID, or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Examinations</option>
            {(exams ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as 'All' | Grade)}>
            <option value="All">All Grades (A+ to F)</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="F">F</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Passed' | 'Failed')}>
            <option value="All">All Statuses</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="All">All Batches</option>
            {(groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={() => {
              setSearchText('');
              setExamFilter('All');
              setBatchFilter('All');
              setGradeFilter('All');
              setStatusFilter('All');
            }}
          >
            Reset Filters
          </button>
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
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Student Name &amp; Email</th>
                  <th>Roll No.</th>
                  <th>Exam Title &amp; Code</th>
                  <th>Score / Total</th>
                  <th>Grade</th>
                  <th>Integrity Score</th>
                  <th>Result Status</th>
                  <th>Submission Timestamp</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((result) => {
                  const percentage =
                    result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
                  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
                  const student = studentById.get(result.userId);
                  const examCode = examCodeById.get(result.examId);
                  const integrity = integrityScore(result);
                  return (
                    <tr key={result.attemptId}>
                      <td className="ps-4 fw-medium">
                        {student ? student.fullName : 'Unknown Student'}
                        {student && <div className="text-muted small fw-normal">{student.email}</div>}
                      </td>
                      <td>{student?.rollNumber ?? '—'}</td>
                      <td>
                        {result.examTitle}
                        {examCode && <div className="text-muted small">{examCode}</div>}
                      </td>
                      <td>
                        <div className="fw-medium">
                          {result.totalScore} / {result.totalMarks}
                        </div>
                        <div className="text-muted small">({percentage}%)</div>
                      </td>
                      <td>
                        <Badge bg={gradeVariant[grade]}>{grade}</Badge>
                      </td>
                      <td>
                        <Badge bg={integrity >= 90 ? 'success' : integrity >= 70 ? 'warning' : 'danger'}>
                          {integrity}%
                        </Badge>
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
                            to={`/admin/results/students/${result.examId}/${result.attemptId}`}
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View Result Details"
                            aria-label="View result details"
                          >
                            <ViewIcon />
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Download Result PDF"
                            aria-label="Download result PDF"
                            onClick={() => handleDownload(result)}
                          >
                            <DownloadIcon />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View integrity/proctoring details"
                            aria-label="View integrity details"
                            onClick={() => setIntegrityTarget(result)}
                          >
                            <ShieldIcon />
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
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
      />

      <Modal show={!!integrityTarget} onHide={() => setIntegrityTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Integrity Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {integrityTarget && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">Integrity Score</span>
                <Badge
                  bg={
                    integrityScore(integrityTarget) >= 90
                      ? 'success'
                      : integrityScore(integrityTarget) >= 70
                        ? 'warning'
                        : 'danger'
                  }
                  className="fs-6"
                >
                  {integrityScore(integrityTarget)}%
                </Badge>
              </div>
              <Table size="sm" className="mb-0">
                <tbody>
                  {VIOLATION_COUNT_FIELDS.map(({ field, type }) => (
                    <tr key={field}>
                      <td className="text-muted">{violationLabel[type]}</td>
                      <td className="text-end">{integrityTarget[field] as number}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>
    </RoleAwareLayout>
  );
}
