import { useCallback, useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { BookIcon, PulseIcon, TargetIcon, CheckCircleIcon, FlagIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { EXAM_CATEGORIES } from '../../types/exam';
import type { CreationMethod } from '../../types/exam';
import { bucketByDay, computeDelta, getDefaultRange, getPriorPeriod, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';

function avgPercent(rows: { totalScore: number; totalMarks: number }[]): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, r) => sum + (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0), 0);
  return total / rows.length;
}

export default function AdminReports() {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examIds);

  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [category, setCategory] = useState('All');
  const [creationMethod, setCreationMethod] = useState<'All' | CreationMethod>('All');

  const loading = isLoadingExams || isLoadingResults || isLoadingAttempts;

  const filteredExams = useMemo(
    () =>
      (exams ?? []).filter(
        (e) =>
          (category === 'All' || e.category === category) &&
          (creationMethod === 'All' || e.creationMethod === creationMethod),
      ),
    [exams, category, creationMethod],
  );
  const filteredExamIds = useMemo(() => new Set(filteredExams.map((e) => e.id)), [filteredExams]);

  const allAttempts = useMemo(
    () => Object.values(attemptsByExam).flat().filter((a) => filteredExamIds.has(a.examId)),
    [attemptsByExam, filteredExamIds],
  );

  const computeStats = useCallback(
    (r: DateRange) => {
      const results = (allResults ?? []).filter(
        (row) => filteredExamIds.has(row.examId) && isWithinRange(row.submittedAtUtc, r),
      );
      const attemptsStarted = allAttempts.filter((a) => isWithinRange(a.startedAtUtc, r));
      const attemptsCompleted = attemptsStarted.filter((a) => a.status !== 'InProgress');
      const passCount = results.filter((row) => row.passed).length;
      return {
        results,
        totalExams: new Set(results.map((row) => row.examId)).size,
        totalAttempts: results.length,
        averageScore: avgPercent(results),
        passPercentage: results.length === 0 ? 0 : (passCount / results.length) * 100,
        completionRate: attemptsStarted.length === 0 ? 0 : (attemptsCompleted.length / attemptsStarted.length) * 100,
      };
    },
    [allResults, allAttempts, filteredExamIds],
  );

  const current = useMemo(() => computeStats(range), [computeStats, range]);
  const prior = useMemo(() => computeStats(getPriorPeriod(range)), [computeStats, range]);

  const attemptsOverview = useMemo(
    () => bucketByDay(current.results.map((r) => r.submittedAtUtc), range),
    [current.results, range],
  );

  const perExamStats = useMemo(() => {
    const byExam = new Map<string, { attempts: number; passCount: number; scoreSum: number }>();
    for (const r of current.results) {
      const entry = byExam.get(r.examId) ?? { attempts: 0, passCount: 0, scoreSum: 0 };
      entry.attempts += 1;
      if (r.passed) entry.passCount += 1;
      entry.scoreSum += r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
      byExam.set(r.examId, entry);
    }
    return filteredExams.map((exam) => {
      const stat = byExam.get(exam.id) ?? { attempts: 0, passCount: 0, scoreSum: 0 };
      const examAttempts = allAttempts.filter((a) => a.examId === exam.id && isWithinRange(a.startedAtUtc, range));
      const completed = examAttempts.filter((a) => a.status !== 'InProgress');
      return {
        exam,
        attempts: stat.attempts,
        averageScore: stat.attempts === 0 ? 0 : stat.scoreSum / stat.attempts,
        passPercent: stat.attempts === 0 ? 0 : (stat.passCount / stat.attempts) * 100,
        completionRate: examAttempts.length === 0 ? 0 : (completed.length / examAttempts.length) * 100,
      };
    });
  }, [filteredExams, current.results, allAttempts, range]);

  const top5 = useMemo(
    () => [...perExamStats].sort((a, b) => b.attempts - a.attempts).slice(0, 5),
    [perExamStats],
  );

  return (
    <AdminLayout active="Exam Reports">
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Reports</h1>
      <p className="text-muted mb-4">Detailed insights and analytics about exams.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setCategory('All');
          setCreationMethod('All');
        }}
        exportFilename="exam-reports"
        exportHeaders={['Exam', 'Category', 'Total Attempts', 'Average Score %', 'Pass %', 'Completion Rate %']}
        exportRows={() =>
          perExamStats.map((s) => [
            s.exam.title,
            s.exam.category,
            s.attempts,
            Math.round(s.averageScore),
            Math.round(s.passPercent),
            Math.round(s.completionRate),
          ])
        }
      >
        <Col xs="auto">
          <Form.Select
            size="sm"
            value={creationMethod}
            onChange={(e) => setCreationMethod(e.target.value as 'All' | CreationMethod)}
          >
            <option value="All">All Exams</option>
            <option value="Manual">Manual</option>
            <option value="AiGenerated">AI Generated</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
              <ReportStatCard
                icon={<BookIcon />}
                label="Total Exams"
                value={String(current.totalExams)}
                delta={computeDelta(current.totalExams, prior.totalExams)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<PulseIcon />}
                label="Total Attempts"
                value={current.totalAttempts.toLocaleString()}
                delta={computeDelta(current.totalAttempts, prior.totalAttempts)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<TargetIcon />}
                label="Average Score"
                value={`${Math.round(current.averageScore)}%`}
                delta={computeDelta(current.averageScore, prior.averageScore)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Pass Percentage"
                value={`${Math.round(current.passPercentage)}%`}
                delta={computeDelta(current.passPercentage, prior.passPercentage)}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<FlagIcon />}
                label="Completion Rate"
                value={`${Math.round(current.completionRate)}%`}
                delta={computeDelta(current.completionRate, prior.completionRate)}
              />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <SectionHeader icon={<span className="text-primary d-flex"><PulseIcon /></span>} title="Exam Attempts Overview" />
                  <LineTrendChart
                    series={[{ name: 'Attempts', color: '#4f46e5', data: attemptsOverview.map((b) => ({ label: b.label, value: b.count })) }]}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-0">
                  <div className="p-3 pb-0">
                    <SectionHeader icon={<span className="text-primary d-flex"><FlagIcon /></span>} title="Top 5 Exams by Attempts" />
                  </div>
                  {top5.length === 0 ? (
                    <div className="text-center text-muted py-5">No attempts yet.</div>
                  ) : (
                    <Table responsive size="sm" className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th className="ps-3">#</th>
                          <th>Exam</th>
                          <th>Attempts</th>
                          <th>Avg Score</th>
                          <th className="pe-3">Pass %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top5.map((s, i) => (
                          <tr key={s.exam.id}>
                            <td className="ps-3">{i + 1}</td>
                            <td className="fw-medium">{s.exam.title}</td>
                            <td>{s.attempts}</td>
                            <td>{Math.round(s.averageScore)}%</td>
                            <td className="pe-3">{Math.round(s.passPercent)}%</td>
                          </tr>
                        ))}
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
                <SectionHeader icon={<span className="text-primary d-flex"><BookIcon /></span>} title="Exam Summary" />
              </div>
              {perExamStats.length === 0 ? (
                <div className="text-center text-muted py-5">No exams match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">Exam Name</th>
                      <th>Category</th>
                      <th>Total Attempts</th>
                      <th>Average Score</th>
                      <th>Pass %</th>
                      <th>Completion Rate</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perExamStats.map((s) => (
                      <tr key={s.exam.id}>
                        <td className="ps-4 fw-medium">{s.exam.title}</td>
                        <td>{s.exam.category}</td>
                        <td>{s.attempts}</td>
                        <td>{Math.round(s.averageScore)}%</td>
                        <td>{Math.round(s.passPercent)}%</td>
                        <td>{Math.round(s.completionRate)}%</td>
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
        </>
      )}
    </AdminLayout>
  );
}
