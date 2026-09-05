import { useCallback, useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import DonutChart from '../../components/charts/DonutChart';
import { ViewIcon, UsersIcon } from '../../components/icons/ActionIcons';
import { UserCheckIcon, TargetIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { computeDelta, getDefaultRange, getPriorPeriod, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AdminAttemptResultResponse } from '../../types/result';
import { SCORE_BUCKETS } from '../../utils/scoreBuckets';

function statusLabel(avgPercent: number): { text: string; variant: string } {
  if (avgPercent >= 90) return { text: 'Excellent', variant: 'success' };
  if (avgPercent >= 75) return { text: 'Very Good', variant: 'info' };
  if (avgPercent >= 50) return { text: 'Good', variant: 'warning' };
  return { text: 'Needs Improvement', variant: 'danger' };
}

interface StudentAgg {
  userId: string;
  fullName: string;
  email: string;
  attempts: AdminAttemptResultResponse[];
  averagePercent: number;
  highestPercent: number;
  lowestPercent: number;
  passPercent: number;
  lastAttemptUtc: string;
}

export default function StudentReports() {
  const { data: exams } = useExams();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);

  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [studentFilter, setStudentFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');
  const [modalStudent, setModalStudent] = useState<StudentAgg | null>(null);

  const loading = isLoadingUsers || isLoadingResults;
  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);

  const buildAggregates = useCallback(
    (r: DateRange): StudentAgg[] => {
      const inRange = (allResults ?? []).filter(
        (row) => isWithinRange(row.submittedAtUtc, r) && (examFilter === 'All' || row.examId === examFilter),
      );
      const byStudent = new Map<string, AdminAttemptResultResponse[]>();
      for (const row of inRange) {
        const list = byStudent.get(row.userId) ?? [];
        list.push(row);
        byStudent.set(row.userId, list);
      }
      const result: StudentAgg[] = [];
      for (const student of students) {
        if (studentFilter !== 'All' && student.id !== studentFilter) continue;
        const attempts = byStudent.get(student.id) ?? [];
        if (attempts.length === 0) continue;
        const percentages = attempts.map((a) => (a.totalMarks > 0 ? (a.totalScore / a.totalMarks) * 100 : 0));
        const passCount = attempts.filter((a) => a.passed).length;
        result.push({
          userId: student.id,
          fullName: student.fullName,
          email: student.email,
          attempts,
          averagePercent: percentages.reduce((s, p) => s + p, 0) / percentages.length,
          highestPercent: Math.max(...percentages),
          lowestPercent: Math.min(...percentages),
          passPercent: (passCount / attempts.length) * 100,
          lastAttemptUtc: attempts.reduce((max, a) => (a.submittedAtUtc > max ? a.submittedAtUtc : max), attempts[0].submittedAtUtc),
        });
      }
      return result;
    },
    [allResults, students, studentFilter, examFilter],
  );

  const activeStudents = useMemo(() => buildAggregates(range), [buildAggregates, range]);
  const priorActiveStudents = useMemo(() => buildAggregates(getPriorPeriod(range)), [buildAggregates, range]);

  const kpis = useMemo(() => {
    const totalStudents = studentFilter === 'All' ? students.length : Math.min(1, students.filter((s) => s.id === studentFilter).length);
    const allPercents = activeStudents.map((s) => s.averagePercent);
    const averageScore = allPercents.length === 0 ? 0 : allPercents.reduce((a, b) => a + b, 0) / allPercents.length;
    const allAttempts = activeStudents.flatMap((s) => s.attempts);
    const passPercentage = allAttempts.length === 0 ? 0 : (allAttempts.filter((a) => a.passed).length / allAttempts.length) * 100;
    const atRisk = activeStudents.filter((s) => s.passPercent < 50).length;
    return { totalStudents, activeStudents: activeStudents.length, averageScore, passPercentage, atRisk };
  }, [activeStudents, students, studentFilter]);

  const priorKpis = useMemo(() => {
    const allPercents = priorActiveStudents.map((s) => s.averagePercent);
    const averageScore = allPercents.length === 0 ? 0 : allPercents.reduce((a, b) => a + b, 0) / allPercents.length;
    const allAttempts = priorActiveStudents.flatMap((s) => s.attempts);
    const passPercentage = allAttempts.length === 0 ? 0 : (allAttempts.filter((a) => a.passed).length / allAttempts.length) * 100;
    const atRisk = priorActiveStudents.filter((s) => s.passPercent < 50).length;
    return { activeStudents: priorActiveStudents.length, averageScore, passPercentage, atRisk };
  }, [priorActiveStudents]);

  const distribution = useMemo(
    () =>
      SCORE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        color: bucket.color,
        value: activeStudents.filter((s) => s.averagePercent >= bucket.min && s.averagePercent < bucket.max).length,
      })),
    [activeStudents],
  );

  const topStudents = useMemo(
    () => [...activeStudents].sort((a, b) => b.averagePercent - a.averagePercent).slice(0, 5),
    [activeStudents],
  );

  return (
    <AdminLayout active="Student Reports">
      <h1 className="h4 fw-bold mb-1 text-primary">Student Reports</h1>
      <p className="text-muted mb-4">Detailed performance and activity reports for students.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setStudentFilter('All');
          setExamFilter('All');
        }}
        exportFilename="student-reports"
        exportHeaders={['Student', 'Email', 'Exams Attempted', 'Average %', 'Highest %', 'Lowest %', 'Pass %', 'Last Attempt']}
        exportRows={() =>
          activeStudents.map((s) => [
            s.fullName,
            s.email,
            s.attempts.length,
            Math.round(s.averagePercent),
            Math.round(s.highestPercent),
            Math.round(s.lowestPercent),
            Math.round(s.passPercent),
            new Date(s.lastAttemptUtc).toLocaleDateString(),
          ])
        }
      >
        <Col xs="auto">
          <Form.Select size="sm" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="All">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={examFilter} onChange={(e) => setExamFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="All">All Exams</option>
            {(exams ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Form.Select>
        </Col>
      </ReportFilters>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<UsersIcon />} label="Total Students" value={kpis.totalStudents.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<UserCheckIcon />}
                label="Active Students"
                value={kpis.activeStudents.toLocaleString()}
                delta={computeDelta(kpis.activeStudents, priorKpis.activeStudents)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<TargetIcon />}
                label="Average Score"
                value={`${Math.round(kpis.averageScore)}%`}
                delta={computeDelta(kpis.averageScore, priorKpis.averageScore)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Pass Percentage"
                value={`${Math.round(kpis.passPercentage)}%`}
                delta={computeDelta(kpis.passPercentage, priorKpis.passPercentage)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<AlertTriangleIcon />}
                label="At Risk Students"
                value={kpis.atRisk.toLocaleString()}
                delta={computeDelta(kpis.atRisk, priorKpis.atRisk)}
                iconBg="#fef2f2"
                iconColor="#dc2626"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <SectionHeader icon={<span className="text-primary d-flex"><TargetIcon /></span>} title="Score Distribution" />
                  <DonutChart data={distribution} centerLabel="Students" />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-0">
                  <div className="p-3 pb-0">
                    <SectionHeader icon={<span className="text-primary d-flex"><UserCheckIcon /></span>} title="Top Students" />
                  </div>
                  {topStudents.length === 0 ? (
                    <div className="text-center text-muted py-5">No attempts yet.</div>
                  ) : (
                    <Table responsive size="sm" className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th className="ps-3">#</th>
                          <th>Student</th>
                          <th>Average Score</th>
                          <th>Exams Attempted</th>
                          <th className="pe-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topStudents.map((s, i) => {
                          const status = statusLabel(s.averagePercent);
                          return (
                            <tr key={s.userId}>
                              <td className="ps-3">{i + 1}</td>
                              <td className="fw-medium">{s.fullName}</td>
                              <td>{Math.round(s.averagePercent)}%</td>
                              <td>{s.attempts.length}</td>
                              <td className="pe-3">
                                <Badge bg={status.variant}>{status.text}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="p-3 pb-0">
                <SectionHeader icon={<span className="text-primary d-flex"><CheckCircleIcon /></span>} title="Student Performance Overview" />
              </div>
              {activeStudents.length === 0 ? (
                <div className="text-center text-muted py-5">No students match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">Student</th>
                      <th>Exams Attempted</th>
                      <th>Average Score</th>
                      <th>Highest Score</th>
                      <th>Lowest Score</th>
                      <th>Pass %</th>
                      <th>Last Attempt</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((s) => (
                      <tr key={s.userId}>
                        <td className="ps-4">
                          <div className="fw-medium">{s.fullName}</div>
                          <div className="text-muted small">{s.email}</div>
                        </td>
                        <td>{s.attempts.length}</td>
                        <td>{Math.round(s.averagePercent)}%</td>
                        <td>{Math.round(s.highestPercent)}%</td>
                        <td>{Math.round(s.lowestPercent)}%</td>
                        <td>{Math.round(s.passPercent)}%</td>
                        <td>{new Date(s.lastAttemptUtc).toLocaleDateString()}</td>
                        <td className="pe-4">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="View Details"
                            aria-label="View student details"
                            onClick={() => setModalStudent(s)}
                          >
                            <ViewIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={!!modalStudent} onHide={() => setModalStudent(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{modalStudent?.fullName} - Exam Breakdown</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalStudent && (
            <Table size="sm" className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase">
                <tr>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                </tr>
              </thead>
              <tbody>
                {modalStudent.attempts.map((a) => (
                  <tr key={a.attemptId}>
                    <td>{a.examTitle}</td>
                    <td>{a.totalScore} / {a.totalMarks}</td>
                    <td>{a.totalMarks > 0 ? Math.round((a.totalScore / a.totalMarks) * 100) : 0}%</td>
                    <td>
                      <Badge bg={a.passed ? 'success' : 'danger'}>{a.passed ? 'Passed' : 'Failed'}</Badge>
                    </td>
                    <td>{new Date(a.submittedAtUtc).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </AdminLayout>
  );
}
