import { useMemo, useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import UserAvatar from '../../components/UserAvatar';
import DonutChart from '../../components/charts/DonutChart';
import { ViewIcon, DownloadIcon, ShieldIcon, EditIcon } from '../../components/icons/ActionIcons';
import { useExam } from '../../hooks/useExams';
import { useStudents } from '../../hooks/useUsers';
import { useSections } from '../../hooks/useSections';
import { useQuestions } from '../../hooks/useQuestions';
import { useAttemptsByExam, useViolationsByExam } from '../../hooks/useSubmissions';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { getGrade } from '../../types/result';
import { violationLabel, severityVariant } from '../../utils/proctoring';
import { generateResultPdf, isQuestionCorrect, isSkipped } from '../../utils/generateResultPdf';
import { computeSectionStats } from '../../utils/sectionStats';
import type { AdminAttemptResultResponse } from '../../types/result';
import type { ProctoringViolationType } from '../../types/submission';

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

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

function integrityScore(result: AdminAttemptResultResponse): number {
  const totalViolations = VIOLATION_COUNT_FIELDS.reduce((sum, { field }) => sum + (result[field] as number), 0);
  return Math.max(0, 100 - totalViolations * 5);
}

function integrityLabel(score: number): { text: string; variant: string } {
  if (score >= 90) return { text: 'Good', variant: 'success' };
  if (score >= 70) return { text: 'Fair', variant: 'warning' };
  return { text: 'Poor', variant: 'danger' };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds}s`;
}

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TABS = ['Overview', 'Question-wise', 'Section-wise', 'Attempt Details', 'Activity Log'] as const;
type TabName = (typeof TABS)[number];

export default function StudentResultDetails() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabName>('Overview');

  const { data: exam, isLoading: isLoadingExam } = useExam(examId);
  const exams = useMemo(() => (exam ? [exam] : []), [exam]);
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examId ? [examId] : []);
  const { violationsByExam } = useViolationsByExam(examId ? [examId] : []);
  const { data: sections } = useSections(examId);
  const { data: questions } = useQuestions(examId);

  const sortedResults = useMemo(
    () => [...allResults].sort((a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime()),
    [allResults],
  );
  const resultIndex = sortedResults.findIndex((r) => r.attemptId === attemptId);
  const result = resultIndex >= 0 ? sortedResults[resultIndex] : undefined;
  const previousResult = resultIndex > 0 ? sortedResults[resultIndex - 1] : null;
  const nextResult = resultIndex >= 0 && resultIndex < sortedResults.length - 1 ? sortedResults[resultIndex + 1] : null;

  const { data: students } = useStudents();
  const student = students?.find((s) => s.id === result?.userId);

  const attempt = useMemo(
    () => (examId ? (attemptsByExam[examId] ?? []).find((a) => a.id === attemptId) : undefined),
    [attemptsByExam, examId, attemptId],
  );

  const violations = useMemo(
    () => (examId ? (violationsByExam[examId] ?? []).filter((v) => v.attemptId === attemptId) : []),
    [violationsByExam, examId, attemptId],
  );

  const sectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections ?? []) map.set(s.id, s.name);
    return map;
  }, [sections]);

  const sectionIdByQuestionId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const q of questions ?? []) map.set(q.id, q.sectionId);
    return map;
  }, [questions]);

  const sectionStats = useMemo(
    () => (result?.questions ? computeSectionStats(result.questions, sectionIdByQuestionId, sectionNameById) : []),
    [result, sectionIdByQuestionId, sectionNameById],
  );

  // Rank/average-accuracy for the PDF's Performance Analysis panel - real numbers
  // computed from every other student's attempt on this exam (allResults already
  // covers the whole exam, not just this one attempt). Not available on the
  // student-facing "My Result" page, which has no visibility into other students.
  const examRankStats = useMemo(() => {
    if (allResults.length === 0) return null;
    const accuracyOf = (r: AdminAttemptResultResponse) => {
      const attempted = r.questions.filter((q) => !isSkipped(q));
      const correct = attempted.filter((q) => isQuestionCorrect(q)).length;
      return attempted.length > 0 ? (correct / attempted.length) * 100 : 0;
    };
    const byScoreDesc = [...allResults].sort((a, b) => b.totalScore - a.totalScore);
    const rank = result ? byScoreDesc.findIndex((r) => r.attemptId === result.attemptId) + 1 : 0;
    const averageAccuracyPercent = Math.round(
      allResults.reduce((sum, r) => sum + accuracyOf(r), 0) / allResults.length,
    );
    return { rank, totalParticipants: allResults.length, averageAccuracyPercent };
  }, [allResults, result]);

  const performanceOverview = useMemo(() => {
    const correct = sectionStats.reduce((sum, s) => sum + s.correct, 0);
    const incorrect = sectionStats.reduce((sum, s) => sum + s.incorrect, 0);
    const skipped = sectionStats.reduce((sum, s) => sum + s.skipped, 0);
    return { correct, incorrect, skipped };
  }, [sectionStats]);

  const loading = isLoadingExam || isLoadingResults || isLoadingAttempts;

  if (loading) {
    return (
      <RoleAwareLayout active="Student Results">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </RoleAwareLayout>
    );
  }

  if (!exam || !result) {
    return (
      <RoleAwareLayout active="Student Results">
        <div className="text-center text-muted py-5">
          Result not found. <Link to="/admin/results/students">Back to Student Results</Link>
        </div>
      </RoleAwareLayout>
    );
  }

  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
  const integrity = integrityScore(result);
  const integrityMeta = integrityLabel(integrity);
  const timeTakenMs =
    attempt && result.submittedAtUtc
      ? new Date(result.submittedAtUtc).getTime() - new Date(attempt.startedAtUtc).getTime()
      : null;

  return (
    <RoleAwareLayout active="Student Results">
      <div className="text-muted small mb-2">
        <Link to="/admin/results/students" className="text-decoration-none">
          Student Results
        </Link>{' '}
        / Result Details
      </div>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Student Result Details</h1>
          <p className="text-muted mb-0">View detailed result, performance and attempt information.</p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/results/students')}>
            ← Back to List
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!previousResult}
            onClick={() => previousResult && navigate(`/admin/results/students/${previousResult.examId}/${previousResult.attemptId}`)}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!nextResult}
            onClick={() => nextResult && navigate(`/admin/results/students/${nextResult.examId}/${nextResult.attemptId}`)}
          >
            Next →
          </button>
        </div>
      </div>

      <Row className="g-3">
        <Col lg={9}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <Row className="g-3">
                <Col md={5} className="d-flex align-items-center gap-3">
                  <UserAvatar userId={result.userId} fullName={student?.fullName ?? 'Student'} hasPhoto={student?.hasPhoto ?? false} size={48} />
                  <div>
                    <div className="fw-bold">{student?.fullName ?? 'Unknown Student'}</div>
                    <div className="text-muted small">{student?.email}</div>
                  </div>
                </Col>
                <Col md={5} className="d-flex align-items-start gap-2">
                  <div className="text-primary mt-1">
                    <CodeIcon />
                  </div>
                  <div>
                    <div className="fw-bold">{result.examTitle}</div>
                    <div className="text-muted small mb-1">{exam.examCode ?? '—'}</div>
                    <Badge bg="light" text="dark" className="me-1">
                      {exam.category}
                    </Badge>
                    <Badge bg="light" text="dark">
                      Online Exam
                    </Badge>
                  </div>
                </Col>
                <Col md={2} className="text-md-end">
                  <Badge bg={result.passed ? 'success' : 'danger'} className="fs-6">
                    {result.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </Col>
              </Row>
              <hr />
              <Row className="g-3 small">
                <Col xs={6} md={2}>
                  <div className="text-muted">Roll No.</div>
                  <div className="fw-medium">{student?.rollNumber ?? '—'}</div>
                </Col>
                <Col xs={6} md={2}>
                  <div className="text-muted d-flex align-items-center gap-1">
                    <CalendarIcon /> Attempt Date
                  </div>
                  <div className="fw-medium">{attempt ? new Date(attempt.startedAtUtc).toLocaleString() : '—'}</div>
                </Col>
                <Col xs={6} md={2}>
                  <div className="text-muted d-flex align-items-center gap-1">
                    <ClockIcon /> Duration Allotted
                  </div>
                  <div className="fw-medium">{exam.durationMinutes} minutes</div>
                </Col>
                <Col xs={6} md={2}>
                  <div className="text-muted d-flex align-items-center gap-1">
                    <CalendarIcon /> Submission Time
                  </div>
                  <div className="fw-medium">{new Date(result.submittedAtUtc).toLocaleString()}</div>
                </Col>
                <Col xs={6} md={2}>
                  <div className="text-muted d-flex align-items-center gap-1">
                    <ClockIcon /> Time Taken
                  </div>
                  <div className="fw-medium">{timeTakenMs !== null ? formatDuration(timeTakenMs) : '—'}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Row className="g-3 mb-3">
            <Col xs={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Score Obtained</div>
                  <div className="h4 fw-bold mb-0">
                    {result.totalScore} / {result.totalMarks}
                  </div>
                  <div className={result.passed ? 'text-success small' : 'text-danger small'}>{percentage}%</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Grade</div>
                  <Badge bg={gradeVariant[grade]} className="fs-5">
                    {grade}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Integrity Score</div>
                  <div className="h4 fw-bold mb-0">{integrity}%</div>
                  <Badge bg={integrityMeta.variant}>{integrityMeta.text}</Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Result Status</div>
                  <Badge bg={result.passed ? 'success' : 'danger'} className="fs-6">
                    {result.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex gap-3 border-bottom mb-3 flex-wrap">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className="btn btn-link text-decoration-none px-0 pb-2"
                    style={{
                      borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                      color: activeTab === tab ? '#4f46e5' : '#6c757d',
                      fontWeight: activeTab === tab ? 600 : 400,
                    }}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Overview' && (
                <Row className="g-3">
                  <Col lg={7}>
                    <div className="fw-bold mb-2">Section-wise Performance</div>
                    {sectionStats.length === 0 ? (
                      <div className="text-muted small">No section data available.</div>
                    ) : (
                      <Table size="sm" responsive className="align-middle">
                        <thead className="text-muted small text-uppercase">
                          <tr>
                            <th>#</th>
                            <th>Section</th>
                            <th>Questions</th>
                            <th>Correct</th>
                            <th>Incorrect</th>
                            <th>Skipped</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionStats.map((s, i) => (
                            <tr key={s.name}>
                              <td>{i + 1}</td>
                              <td>{s.name}</td>
                              <td>{s.total}</td>
                              <td>{s.correct}</td>
                              <td>{s.incorrect}</td>
                              <td>{s.skipped}</td>
                              <td>
                                {s.score} / {s.maxScore}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                    <div className="fw-bold mt-4 mb-2">Exam Information</div>
                    <Table size="sm" borderless className="mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: 160 }}>Exam Title</td>
                          <td>{result.examTitle}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Exam Code</td>
                          <td>{exam.examCode ?? '—'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Exam Type</td>
                          <td>{exam.examTypeName ?? exam.category}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Total Marks</td>
                          <td>{exam.totalMarks}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Passing Marks</td>
                          <td>
                            {result.passingMarks} ({exam.totalMarks > 0 ? Math.round((result.passingMarks / exam.totalMarks) * 100) : 0}%)
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Duration</td>
                          <td>{exam.durationMinutes} minutes</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Status</td>
                          <td>
                            <Badge bg="secondary">Completed</Badge>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col lg={5}>
                    <div className="fw-bold mb-2">Performance Overview</div>
                    <DonutChart
                      centerLabel={`${percentage}% Accuracy`}
                      data={[
                        { label: 'Correct', value: performanceOverview.correct, color: '#16a34a' },
                        { label: 'Incorrect', value: performanceOverview.incorrect, color: '#dc2626' },
                        { label: 'Skipped', value: performanceOverview.skipped, color: '#94a3b8' },
                      ]}
                    />
                  </Col>
                </Row>
              )}

              {activeTab === 'Question-wise' && (
                <Table size="sm" responsive className="align-middle">
                  <thead className="text-muted small text-uppercase">
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Marks</th>
                      <th>Awarded</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.questions ?? []).map((q, i) => (
                      <tr key={q.questionId}>
                        <td>{i + 1}</td>
                        <td style={{ maxWidth: 340 }}>{q.questionText}</td>
                        <td>{q.questionType}</td>
                        <td>{q.marks}</td>
                        <td>{q.marksAwarded}</td>
                        <td>
                          {isSkipped(q) ? (
                            <Badge bg="secondary">Skipped</Badge>
                          ) : q.isPendingGrading ? (
                            <Badge bg="secondary">Pending Review</Badge>
                          ) : (
                            <Badge bg={isQuestionCorrect(q) ? 'success' : 'danger'}>{isQuestionCorrect(q) ? 'Correct' : 'Incorrect'}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              {activeTab === 'Section-wise' && (
                <div className="d-flex flex-column gap-4">
                  {sectionStats.map((s) => (
                    <div key={s.name}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold">{s.name}</span>
                        <span className="text-muted small">
                          {s.score} / {s.maxScore} marks
                        </span>
                      </div>
                      <Table size="sm" responsive className="align-middle mb-0">
                        <thead className="text-muted small text-uppercase">
                          <tr>
                            <th>Question</th>
                            <th>Marks</th>
                            <th>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.questions ?? [])
                            .filter((q) => {
                              const sectionId = sectionIdByQuestionId.get(q.questionId);
                              const name = (sectionId && sectionNameById.get(sectionId)) || 'Unsectioned';
                              return name === s.name;
                            })
                            .map((q) => (
                              <tr key={q.questionId}>
                                <td style={{ maxWidth: 400 }}>{q.questionText}</td>
                                <td>
                                  {q.marksAwarded} / {q.marks}
                                </td>
                                <td>
                                  {isSkipped(q) ? (
                                    <Badge bg="secondary">Skipped</Badge>
                                  ) : q.isPendingGrading ? (
                                    <Badge bg="secondary">Pending</Badge>
                                  ) : (
                                    <Badge bg={isQuestionCorrect(q) ? 'success' : 'danger'}>{isQuestionCorrect(q) ? 'Correct' : 'Incorrect'}</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'Attempt Details' && (
                <Table size="sm" borderless className="mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 200 }}>Attempt Started</td>
                      <td>{attempt ? new Date(attempt.startedAtUtc).toLocaleString() : '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Submitted</td>
                      <td>{new Date(result.submittedAtUtc).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Time Taken</td>
                      <td>{timeTakenMs !== null ? formatDuration(timeTakenMs) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Pending Grading</td>
                      <td>{result.hasPendingGrading ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted" colSpan={2}>
                        <div className="fw-bold mt-2 mb-1">Proctoring Violation Counts</div>
                      </td>
                    </tr>
                    {VIOLATION_COUNT_FIELDS.map(({ field, type }) => (
                      <tr key={field}>
                        <td className="text-muted">{violationLabel[type]}</td>
                        <td>{result[field] as number}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              {activeTab === 'Activity Log' && (
                <>
                  {violations.length === 0 ? (
                    <div className="text-muted small text-center py-4">No proctoring events recorded for this attempt.</div>
                  ) : (
                    <Table size="sm" responsive className="align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th>Event</th>
                          <th>Severity</th>
                          <th>Detected At</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...violations]
                          .sort((a, b) => new Date(b.detectedAtUtc).getTime() - new Date(a.detectedAtUtc).getTime())
                          .map((v) => (
                            <tr key={v.id}>
                              <td>{violationLabel[v.type]}</td>
                              <td>
                                <Badge bg={severityVariant[v.severity]}>{v.severity}</Badge>
                              </td>
                              <td>{new Date(v.detectedAtUtc).toLocaleString()}</td>
                              <td>{v.status}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <div className="fw-bold mb-3">Actions</div>
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                  onClick={() =>
                    generateResultPdf(result, {
                      studentName: student?.fullName,
                      studentEmail: student?.email,
                      rollNumber: student?.rollNumber,
                      examCode: exam.examCode ?? null,
                      examType: exam.examTypeName ?? exam.category,
                      durationMinutes: exam.durationMinutes,
                      attemptStartedAtUtc: attempt?.startedAtUtc ?? null,
                      integrityScorePercent: integrity,
                      sectionStats,
                      rank: examRankStats?.rank,
                      totalParticipants: examRankStats?.totalParticipants,
                      averageAccuracyPercent: examRankStats?.averageAccuracyPercent,
                    })
                  }
                >
                  <DownloadIcon /> Download Result
                </button>
                <Link to="/admin/live-monitoring/student-attempts" className="btn btn-outline-secondary d-flex align-items-center gap-2">
                  <ViewIcon /> View Student Attempt
                </Link>
                <Link to="/admin/notifications/create" className="btn btn-outline-secondary d-flex align-items-center gap-2">
                  <EditIcon /> Send Email to Student
                </Link>
                <Link to={`/admin/users/${result.userId}`} className="btn btn-outline-secondary d-flex align-items-center gap-2">
                  <ShieldIcon /> View Student Profile
                </Link>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="fw-bold mb-3">Quick Links</div>
              <div className="d-flex flex-column gap-2 small">
                <Link to="/admin/results/students" className="text-decoration-none">
                  All Student Results →
                </Link>
                <Link to="/admin/results/analytics" className="text-decoration-none">
                  Result Analytics →
                </Link>
                <Link to="/admin/results/publish" className="text-decoration-none">
                  Publish Results →
                </Link>
                <Link to={`/admin/exams/${exam.id}`} className="text-decoration-none">
                  Exam Details →
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </RoleAwareLayout>
  );
}
