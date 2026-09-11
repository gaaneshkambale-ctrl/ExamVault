import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import DonutChart from '../../components/charts/DonutChart';
import TablePagination from '../../components/reports/TablePagination';
import { BookIcon, TargetIcon, CheckCircleIcon, UserCheckIcon } from '../../components/reports/ReportIcons';
import { DownloadIcon } from '../../components/icons/ActionIcons';
import { useExam } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useMyTenant } from '../../hooks/useTenants';
import { useQuestionsByExamIds } from '../../hooks/useQuestions';
import { useSectionsByExamIds } from '../../hooks/useSections';
import { useAssignmentsForExam } from '../../hooks/useAssignments';
import { useAuth } from '../../hooks/useAuth';
import { getExamResultsForAdmin } from '../../api/resultApi';
import { getExamResultScheme } from '../../utils/examResultScheme';
import { buildAdvanceExamReport } from '../../utils/advanceExamReport';
import { buildQuestionDifficulty, buildSectionWiseStats } from '../../utils/advanceExamReportAnalysis';
import { generateCertificatePdf } from '../../utils/generateCertificatePdf';
import { exportAdvanceExamReportExcel } from '../../utils/exportAdvanceExamReportExcel';
import { exportAdvanceExamReportPdf } from '../../utils/exportAdvanceExamReportPdf';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function BulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1.1.9 1.8v.5h6.2v-.5c0-.7.4-1.4.9-1.8A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export default function AdvanceExamReport() {
  const { examId } = useParams<{ examId: string }>();
  const { data: exam, isLoading: isLoadingExam } = useExam(examId);
  const { data: attempts, isLoading: isLoadingResults, isError } = useQuery({
    queryKey: ['results', 'byExam', examId],
    queryFn: () => getExamResultsForAdmin(examId!),
    enabled: !!examId,
  });
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: myTenant } = useMyTenant();
  const { user: currentUser } = useAuth();
  const examIds = useMemo(() => (examId ? [examId] : []), [examId]);
  const { questionsByExam } = useQuestionsByExamIds(examIds);
  const { sectionsByExam } = useSectionsByExamIds(examIds);
  const { data: assignments } = useAssignmentsForExam(examId);

  const loading = isLoadingExam || isLoadingResults || isLoadingUsers;
  const scheme = getExamResultScheme(exam?.examTypeName ?? undefined);

  // Exam.startAtUtc/endAtUtc are frequently null - scheduling in this app is
  // actually enforced per-assignment, not per-exam (see StartAttemptHandler.cs's
  // own assignment-first fallback). Falls back to the earliest real assignment
  // window so "Exam Date" isn't a bare "-" whenever the exam itself was never
  // directly scheduled, without fabricating a date that was never really set.
  const effectiveExam = useMemo(() => {
    if (!exam || exam.startAtUtc) return exam;
    const earliest = assignments && assignments.length > 0
      ? [...assignments].sort((a, b) => a.startAtUtc.localeCompare(b.startAtUtc))[0]
      : null;
    return earliest ? { ...exam, startAtUtc: earliest.startAtUtc, endAtUtc: earliest.endAtUtc } : exam;
  }, [exam, assignments]);

  const report = useMemo(
    () => buildAdvanceExamReport(attempts ?? [], users ?? [], scheme),
    [attempts, users, scheme],
  );

  const sectionStats = useMemo(
    () =>
      buildSectionWiseStats(
        attempts ?? [],
        (examId && questionsByExam[examId]) || [],
        (examId && sectionsByExam[examId]) || [],
        exam?.title ?? '',
      ),
    [attempts, questionsByExam, sectionsByExam, examId, exam?.title],
  );
  const questionDifficulty = useMemo(() => buildQuestionDifficulty(attempts ?? []), [attempts]);

  type CombinedRow =
    | { kind: 'present'; row: (typeof report.studentRows)[number] }
    | { kind: 'absent'; row: (typeof report.absentStudents)[number] };

  const combinedRows: CombinedRow[] = useMemo(
    () => [
      ...report.studentRows.map((row) => ({ kind: 'present' as const, row })),
      ...report.absentStudents.map((row) => ({ kind: 'absent' as const, row })),
    ],
    [report],
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    setPage(1);
  }, [examId, combinedRows.length]);

  const totalPages = Math.max(1, Math.ceil(combinedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = combinedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = combinedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, combinedRows.length);

  const [downloadingCertFor, setDownloadingCertFor] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleDownloadCertificate(attemptId: string, attempt: typeof report.studentRows[number]['attempt'], fullName: string) {
    setDownloadingCertFor(attemptId);
    try {
      await generateCertificatePdf(attempt, fullName);
    } finally {
      setDownloadingCertFor(null);
    }
  }

  async function handleExportExcel() {
    if (!effectiveExam) return;
    setExporting(true);
    try {
      await exportAdvanceExamReportExcel(effectiveExam, scheme, report, {
        sectionStats,
        questionDifficulty,
        organization: myTenant,
        generatedByName: currentUser?.fullName,
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    if (!effectiveExam) return;
    setExportingPdf(true);
    try {
      await exportAdvanceExamReportPdf(effectiveExam, scheme, report, {
        sectionStats,
        questionDifficulty,
        organization: myTenant,
        generatedByName: currentUser?.fullName,
      });
    } finally {
      setExportingPdf(false);
    }
  }

  const donutSlices = scheme.hasPassFailConcept
    ? [
        { label: scheme.outcomeLabels.pass, value: report.passCount, color: '#22c55e' },
        { label: scheme.outcomeLabels.fail, value: report.presentCount - report.passCount, color: '#ef4444' },
      ]
    : [];

  const backTo = exam?.examTypeId ? `/admin/reports/exam-type/${exam.examTypeId}` : '/admin/reports/exam-type-wise';

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Results / By Exam Type / Advanced Report</p>
          <h1 className="h4 fw-bold mb-1 text-primary">{exam?.title ?? 'Advanced Report'}</h1>
        </div>
        <div className="d-flex gap-2">
          <Link to={backTo} className="btn btn-outline-secondary btn-sm">
            &larr; Back
          </Link>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
            disabled={loading || exportingPdf || !exam}
            onClick={handleExportPdf}
          >
            <DownloadIcon size={14} /> {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
            disabled={loading || exporting || !exam}
            onClick={handleExportExcel}
          >
            <DownloadIcon size={14} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && isError && (
        <div className="text-center text-danger py-5">Couldn't load this report. Please try again.</div>
      )}

      {!loading && !isError && exam && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <SectionHeader icon={<BookIcon />} title="Exam Overview" />
              <Row className="g-3">
                <Col md={6}>
                  <Row className="g-2">
                    <Col xs={5} className="text-muted small">Exam Name</Col>
                    <Col xs={7} className="fw-medium">{exam.title}</Col>
                    <Col xs={5} className="text-muted small">Exam Type</Col>
                    <Col xs={7} className="fw-medium">{exam.examTypeName ?? '—'}</Col>
                    <Col xs={5} className="text-muted small">Total Marks</Col>
                    <Col xs={7} className="fw-medium">{exam.totalMarks}</Col>
                    <Col xs={5} className="text-muted small">{scheme.passingLabel}</Col>
                    <Col xs={7} className="fw-medium">
                      {exam.passingMarks} ({exam.totalMarks > 0 ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 0}%)
                    </Col>
                  </Row>
                </Col>
                <Col md={6}>
                  <Row className="g-2">
                    <Col xs={5} className="text-muted small">Exam Date</Col>
                    <Col xs={7} className="fw-medium">
                      {effectiveExam?.startAtUtc ? new Date(effectiveExam.startAtUtc).toLocaleString() : '—'}
                    </Col>
                    <Col xs={5} className="text-muted small">Duration</Col>
                    <Col xs={7} className="fw-medium">{exam.durationMinutes} Minutes</Col>
                    <Col xs={5} className="text-muted small">Total Participants</Col>
                    <Col xs={7} className="fw-medium">{report.totalCandidates}</Col>
                    <Col xs={5} className="text-muted small">Status</Col>
                    <Col xs={7} className="fw-medium">{exam.status}</Col>
                  </Row>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row className="g-3 mb-4">
            {[
              { label: 'Total Candidates', value: report.totalCandidates, color: undefined },
              { label: 'Present', value: report.presentCount, color: 'text-success' },
              { label: 'Absent', value: report.absentCount, color: 'text-danger' },
              { label: 'Average Score', value: `${report.averagePercentage}%`, color: 'text-info' },
              { label: 'Highest Score', value: report.highest ? `${Math.round(report.highest.percent * 10) / 10}%` : '—', color: 'text-success' },
              { label: 'Lowest Score', value: report.lowest ? `${Math.round(report.lowest.percent * 10) / 10}%` : '—', color: 'text-danger' },
            ].map((card) => (
              <Col md={4} lg={2} key={card.label}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <div className="text-muted small mb-1">{card.label}</div>
                    <div className={`h5 fw-bold mb-0 ${card.color ?? ''}`}>{card.value}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Row className="g-3 mb-4">
            <Col md={scheme.hasPassFailConcept ? 7 : 12}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <SectionHeader icon={<TargetIcon />} title="Score Distribution" />
                  <ScoreDistributionChart data={report.distribution} />
                </Card.Body>
              </Card>
            </Col>
            {scheme.hasPassFailConcept && (
              <Col md={5}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <SectionHeader icon={<CheckCircleIcon />} title={`${scheme.outcomeLabels.pass} / ${scheme.outcomeLabels.fail} Summary`} />
                    <DonutChart data={donutSlices} centerLabel={`${report.presentCount} Total`} />
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-0">
              <div className="p-4 pb-3">
                <SectionHeader icon={<UserCheckIcon />} title="Student Performance Details" />
              </div>

              {report.studentRows.length === 0 && report.absentStudents.length === 0 && (
                <div className="text-center text-muted py-5">No students found for this tenant.</div>
              )}

              {(report.studentRows.length > 0 || report.absentStudents.length > 0) && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">Roll Number</th>
                      <th>Student Name</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Result</th>
                      {scheme.showRankPercentile && <th>Rank</th>}
                      {scheme.showRankPercentile && <th>Percentile</th>}
                      <th>Submitted On</th>
                      {scheme.showCertificate && <th className="pe-4">Certificate</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((entry) =>
                      entry.kind === 'present' ? (
                        <tr key={entry.row.student.id}>
                          <td className="ps-4">{entry.row.student.rollNumber ?? '—'}</td>
                          <td className="fw-medium">{entry.row.student.fullName}</td>
                          <td><Badge bg="success">Present</Badge></td>
                          <td>{entry.row.attempt.totalScore} / {entry.row.attempt.totalMarks}</td>
                          <td>{Math.round(entry.row.percent * 10) / 10}%</td>
                          <td>
                            {scheme.hasPassFailConcept ? (
                              <Badge bg={entry.row.attempt.passed ? 'success' : 'danger'}>
                                {entry.row.attempt.passed ? scheme.outcomeLabels.pass : scheme.outcomeLabels.fail}
                              </Badge>
                            ) : (
                              <span className="text-muted small">Performance only</span>
                            )}
                          </td>
                          {scheme.showRankPercentile && <td>{entry.row.rank ?? '—'}</td>}
                          {scheme.showRankPercentile && <td>{entry.row.percentile !== null ? `${entry.row.percentile}%` : '—'}</td>}
                          <td>{new Date(entry.row.attempt.submittedAtUtc).toLocaleString()}</td>
                          {scheme.showCertificate && (
                            <td className="pe-4">
                              {entry.row.attempt.passed ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  disabled={downloadingCertFor === entry.row.attempt.attemptId}
                                  onClick={() => handleDownloadCertificate(entry.row.attempt.attemptId, entry.row.attempt, entry.row.student.fullName)}
                                >
                                  {downloadingCertFor === entry.row.attempt.attemptId ? 'Generating…' : 'Download'}
                                </button>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr key={entry.row.id} className="text-muted">
                          <td className="ps-4">{entry.row.rollNumber ?? '—'}</td>
                          <td className="fw-medium">{entry.row.fullName}</td>
                          <td><Badge bg="secondary">Absent</Badge></td>
                          <td>—</td>
                          <td>—</td>
                          <td><Badge bg="secondary">Absent</Badge></td>
                          {scheme.showRankPercentile && <td>—</td>}
                          {scheme.showRankPercentile && <td>—</td>}
                          <td>—</td>
                          {scheme.showCertificate && <td className="pe-4">—</td>}
                        </tr>
                      ),
                    )}
                  </tbody>
                </Table>
              )}
              {combinedRows.length > 0 && (
                <div className="p-3">
                  <TablePagination
                    page={currentPage}
                    totalPages={totalPages}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    totalCount={combinedRows.length}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <SectionHeader icon={<BulbIcon />} title="Exam Insights" />
              <ul className="mb-0 small">
                {report.highest && (
                  <li>
                    Highest Score: {Math.round(report.highest.percent * 10) / 10}% ({report.highest.student.fullName})
                  </li>
                )}
                {report.lowest && (
                  <li>
                    Lowest Score: {Math.round(report.lowest.percent * 10) / 10}% ({report.lowest.student.fullName})
                  </li>
                )}
                {scheme.hasPassFailConcept && <li>{scheme.outcomeLabels.pass} Rate: {report.passRate}%</li>}
                <li>Average Score: {report.averagePercentage}%</li>
                {report.mostCommonBucket && report.mostCommonBucket.count > 0 && (
                  <li>Most Common Score Range: {report.mostCommonBucket.label} ({report.mostCommonBucket.count} students)</li>
                )}
              </ul>
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
