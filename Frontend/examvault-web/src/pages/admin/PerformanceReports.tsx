import { useCallback, useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import LineTrendChart from '../../components/charts/LineTrendChart';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import { TargetIcon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon, TrendingUpIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { EXAM_CATEGORIES } from '../../types/exam';
import { SCORE_BUCKETS } from '../../utils/scoreBuckets';
import { bucketByDay, computeDelta, getDefaultRange, getPriorPeriod, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AdminAttemptResultResponse } from '../../types/result';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

export default function PerformanceReports() {
  const { data: exams } = useExams();
  const { data: allResults, isLoading } = useAdminResultsForAllExams(exams);

  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [category, setCategory] = useState('All');
  const [examFilter, setExamFilter] = useState('All');

  const filteredExamIds = useMemo(() => {
    const allowed = (exams ?? []).filter((e) => category === 'All' || e.category === category).map((e) => e.id);
    return new Set(examFilter === 'All' ? allowed : allowed.filter((id) => id === examFilter));
  }, [exams, category, examFilter]);

  const computeStats = useCallback(
    (r: DateRange) => {
      const results = (allResults ?? []).filter((row) => filteredExamIds.has(row.examId) && isWithinRange(row.submittedAtUtc, r));
      const percentages = results.map(percentOf);
      const passCount = results.filter((row) => row.passed).length;
      return {
        results,
        percentages,
        averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
        highestScore: percentages.length === 0 ? 0 : Math.max(...percentages),
        lowestScore: percentages.length === 0 ? 0 : Math.min(...percentages),
        passPercentage: results.length === 0 ? 0 : (passCount / results.length) * 100,
      };
    },
    [allResults, filteredExamIds],
  );

  const current = useMemo(() => computeStats(range), [computeStats, range]);
  const prior = useMemo(() => computeStats(getPriorPeriod(range)), [computeStats, range]);
  const improvement = computeDelta(current.averageScore, prior.averageScore);

  const trend = useMemo(() => {
    const byDay = bucketByDay(current.results.map((r) => r.submittedAtUtc), range);
    const avgSeries = byDay.map((bucket) => {
      const rows = current.results.filter((r) => r.submittedAtUtc.slice(0, 10) === bucket.date);
      const pcts = rows.map(percentOf);
      return { label: bucket.label, value: pcts.length === 0 ? 0 : Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
    });
    const passSeries = byDay.map((bucket) => {
      const rows = current.results.filter((r) => r.submittedAtUtc.slice(0, 10) === bucket.date);
      return { label: bucket.label, value: rows.length === 0 ? 0 : Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) };
    });
    return { avgSeries, passSeries };
  }, [current.results, range]);

  const scoreRangeAnalysis = useMemo(
    () =>
      SCORE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        count: current.percentages.filter((p) => p >= bucket.min && p < bucket.max).length,
      })),
    [current.percentages],
  );

  const performanceByExam = useMemo(() => {
    const currentByExam = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of current.results) {
      const list = currentByExam.get(r.examId) ?? [];
      list.push(r);
      currentByExam.set(r.examId, list);
    }
    const priorByExam = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of prior.results) {
      const list = priorByExam.get(r.examId) ?? [];
      list.push(r);
      priorByExam.set(r.examId, list);
    }
    return (exams ?? [])
      .filter((e) => filteredExamIds.has(e.id) && (currentByExam.get(e.id)?.length ?? 0) > 0)
      .map((exam) => {
        const rows = currentByExam.get(exam.id) ?? [];
        const priorRows = priorByExam.get(exam.id) ?? [];
        const pcts = rows.map(percentOf);
        const priorPcts = priorRows.map(percentOf);
        const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
        const priorAvg = priorPcts.length === 0 ? 0 : priorPcts.reduce((a, b) => a + b, 0) / priorPcts.length;
        return {
          exam,
          averageScore: avg,
          highestScore: Math.max(...pcts),
          lowestScore: Math.min(...pcts),
          passPercent: (rows.filter((r) => r.passed).length / rows.length) * 100,
          improvement: computeDelta(avg, priorAvg),
        };
      });
  }, [exams, current.results, prior.results, filteredExamIds]);

  return (
    <AdminLayout active="Performance Reports">
      <h1 className="h4 fw-bold mb-1 text-primary">Performance Reports</h1>
      <p className="text-muted mb-4">Analyze performance trends and metrics.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setCategory('All');
          setExamFilter('All');
        }}
        exportFilename="performance-reports"
        exportHeaders={['Exam', 'Average %', 'Highest %', 'Lowest %', 'Pass %', 'Improvement %']}
        exportRows={() =>
          performanceByExam.map((p) => [
            p.exam.title,
            Math.round(p.averageScore),
            Math.round(p.highestScore),
            Math.round(p.lowestScore),
            Math.round(p.passPercent),
            p.improvement.percent ?? 0,
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

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<TargetIcon />} label="Average Score" value={`${Math.round(current.averageScore)}%`} delta={computeDelta(current.averageScore, prior.averageScore)} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<ArrowUpIcon />} label="Highest Score" value={`${Math.round(current.highestScore)}%`} delta={computeDelta(current.highestScore, prior.highestScore)} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<ArrowDownIcon />} label="Lowest Score" value={`${Math.round(current.lowestScore)}%`} delta={computeDelta(current.lowestScore, prior.lowestScore)} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<CheckCircleIcon />} label="Pass Percentage" value={`${Math.round(current.passPercentage)}%`} delta={computeDelta(current.passPercentage, prior.passPercentage)} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<TrendingUpIcon />}
                label="Improvement"
                value={
                  improvement.percent === null
                    ? 'New'
                    : `${improvement.percent > 0 ? '+' : ''}${improvement.percent}%`
                }
                iconBg="#f0fdf4"
                iconColor="#16a34a"
              />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <SectionHeader icon={<span className="text-primary d-flex"><TrendingUpIcon /></span>} title="Performance Trend" />
                  <LineTrendChart
                    series={[
                      { name: 'Average Score', color: '#4f46e5', data: trend.avgSeries, isPercent: true },
                      { name: 'Pass Percentage', color: '#22c55e', data: trend.passSeries, isPercent: true },
                    ]}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <SectionHeader icon={<span className="text-primary d-flex"><TargetIcon /></span>} title="Score Range Analysis" />
                  <ScoreDistributionChart data={scoreRangeAnalysis} />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="p-3 pb-0">
                <SectionHeader icon={<span className="text-primary d-flex"><ArrowUpIcon /></span>} title="Performance by Exam" />
              </div>
              {performanceByExam.length === 0 ? (
                <div className="text-center text-muted py-5">No attempts match your filters.</div>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Exam</th>
                      <th>Average Score</th>
                      <th>Highest Score</th>
                      <th>Lowest Score</th>
                      <th>Pass %</th>
                      <th className="pe-4">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceByExam.map((p) => (
                      <tr key={p.exam.id}>
                        <td className="ps-4 fw-medium">{p.exam.title}</td>
                        <td>{Math.round(p.averageScore)}%</td>
                        <td>{Math.round(p.highestScore)}%</td>
                        <td>{Math.round(p.lowestScore)}%</td>
                        <td>{Math.round(p.passPercent)}%</td>
                        <td className="pe-4">
                          <span className={p.improvement.direction === 'up' ? 'text-success' : p.improvement.direction === 'down' ? 'text-danger' : 'text-muted'}>
                            {p.improvement.direction === 'up' && '▲ '}
                            {p.improvement.direction === 'down' && '▼ '}
                            {p.improvement.percent === null ? 'New' : `${Math.abs(p.improvement.percent)}%`}
                          </span>
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
