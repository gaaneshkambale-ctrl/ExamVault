import { useMemo, useState } from 'react';
import { Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportStatCard from '../../components/reports/ReportStatCard';
import LineTrendChart from '../../components/charts/LineTrendChart';
import DonutChart from '../../components/charts/DonutChart';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import { TargetIcon, CheckCircleIcon, UserCheckIcon, ArrowUpIcon, ArrowDownIcon, ActivityIcon } from '../../components/reports/ReportIcons';
import { useExams } from '../../hooks/useExams';
import { useAdminResultsForAllExams } from '../../hooks/useAdminResults';
import { EXAM_CATEGORIES } from '../../types/exam';
import { SCORE_BUCKETS } from '../../utils/scoreBuckets';
import { bucketByDay, getDefaultRange, isWithinRange } from '../../utils/dateRange';
import type { DateRange } from '../../utils/dateRange';
import type { AdminAttemptResultResponse } from '../../types/result';

const CATEGORY_COLORS = ['#4f46e5', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#8b5cf6'];

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

export default function ResultAnalytics() {
  const { data: exams } = useExams();
  const { data: allResults, isLoading } = useAdminResultsForAllExams(exams);

  const [range, setRange] = useState<DateRange>(() => getDefaultRange());
  const [examFilter, setExamFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const examById = useMemo(() => new Map((exams ?? []).map((e) => [e.id, e])), [exams]);

  const filteredResults = useMemo(() => {
    return allResults.filter((r) => {
      if (!isWithinRange(r.submittedAtUtc, range)) return false;
      if (examFilter !== 'All' && r.examId !== examFilter) return false;
      if (categoryFilter !== 'All' && examById.get(r.examId)?.category !== categoryFilter) return false;
      return true;
    });
  }, [allResults, range, examFilter, categoryFilter, examById]);

  const percentages = filteredResults.map(percentOf);

  const kpis = useMemo(() => {
    const passCount = filteredResults.filter((r) => r.passed).length;
    const average = percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const variance =
      percentages.length === 0
        ? 0
        : percentages.reduce((sum, p) => sum + (p - average) ** 2, 0) / percentages.length;
    return {
      averageScore: average,
      passPercentage: filteredResults.length === 0 ? 0 : (passCount / filteredResults.length) * 100,
      totalCandidates: new Set(filteredResults.map((r) => r.userId)).size,
      highestScore: percentages.length === 0 ? 0 : Math.max(...percentages),
      lowestScore: percentages.length === 0 ? 0 : Math.min(...percentages),
      standardDeviation: Math.sqrt(variance),
    };
  }, [filteredResults, percentages]);

  const scoreDistribution = useMemo(
    () =>
      SCORE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        count: percentages.filter((p) => p >= bucket.min && p < bucket.max).length,
      })),
    [percentages],
  );

  const passFailTrend = useMemo(() => {
    const byDay = bucketByDay(filteredResults.map((r) => r.submittedAtUtc), range);
    const passSeries = byDay.map((bucket) => {
      const rows = filteredResults.filter((r) => r.submittedAtUtc.slice(0, 10) === bucket.date);
      return { label: bucket.label, value: rows.length === 0 ? 0 : Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) };
    });
    const failSeries = passSeries.map((p) => ({ label: p.label, value: 100 - p.value }));
    return { passSeries, failSeries };
  }, [filteredResults, range]);

  const topPerformingExams = useMemo(() => {
    const byExam = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of filteredResults) {
      const list = byExam.get(r.examId) ?? [];
      list.push(r);
      byExam.set(r.examId, list);
    }
    return Array.from(byExam.entries())
      .map(([examId, rows]) => {
        const pcts = rows.map(percentOf);
        const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
        return {
          exam: examById.get(examId),
          examId,
          averageScore: avg,
          passPercent: (rows.filter((r) => r.passed).length / rows.length) * 100,
          highestScore: Math.max(...pcts),
          completed: rows.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [filteredResults, examById]);

  const categoryPerformance = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const r of filteredResults) {
      const category = examById.get(r.examId)?.category ?? 'Uncategorized';
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    }
    return Array.from(byCategory.entries())
      .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredResults, examById]);

  return (
    <AdminLayout active="Result Analytics">
      <h1 className="h4 fw-bold mb-1 text-primary">Result Analytics</h1>
      <p className="text-muted mb-4">Detailed analytics and insights of results.</p>

      <ReportFilters
        range={range}
        onRangeChange={setRange}
        onReset={() => {
          setRange(getDefaultRange());
          setExamFilter('All');
          setCategoryFilter('All');
        }}
        exportFilename="result-analytics"
        exportHeaders={['Exam', 'Average %', 'Highest %', 'Pass %', 'Completed']}
        exportRows={() =>
          topPerformingExams.map((p) => [
            p.exam?.title ?? p.examId,
            Math.round(p.averageScore),
            Math.round(p.highestScore),
            Math.round(p.passPercent),
            p.completed,
          ])
        }
      >
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
        <Col xs="auto">
          <Form.Select size="sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="All">All Categories</option>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
              <ReportStatCard icon={<TargetIcon />} label="Average Score" value={`${Math.round(kpis.averageScore)}%`} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<CheckCircleIcon />} label="Pass Percentage" value={`${Math.round(kpis.passPercentage)}%`} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<UserCheckIcon />} label="Total Candidates" value={kpis.totalCandidates.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<ArrowUpIcon />} label="Highest Score" value={`${Math.round(kpis.highestScore)}%`} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<ArrowDownIcon />} label="Lowest Score" value={`${Math.round(kpis.lowestScore)}%`} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<ActivityIcon />} label="Standard Deviation" value={`${Math.round(kpis.standardDeviation)}%`} />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Score Distribution</h2>
                  <ScoreDistributionChart data={scoreDistribution} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Pass/Fail Trend</h2>
                  <LineTrendChart
                    series={[
                      { name: 'Pass %', color: '#22c55e', data: passFailTrend.passSeries, isPercent: true },
                      { name: 'Fail %', color: '#ef4444', data: passFailTrend.failSeries, isPercent: true },
                    ]}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-0">
                  <h2 className="h6 fw-bold p-3 pb-2 mb-0">Top Performing Exams</h2>
                  {topPerformingExams.length === 0 ? (
                    <div className="text-center text-muted py-5">No attempts match your filters.</div>
                  ) : (
                    <Table responsive size="sm" className="mb-0 align-middle">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                          <th className="ps-3">Exam</th>
                          <th>Average Score</th>
                          <th>Pass %</th>
                          <th>Highest Score</th>
                          <th className="pe-3">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPerformingExams.map((p) => (
                          <tr key={p.examId}>
                            <td className="ps-3 fw-medium">{p.exam?.title ?? 'Unknown exam'}</td>
                            <td>{Math.round(p.averageScore)}%</td>
                            <td>{Math.round(p.passPercent)}%</td>
                            <td>{Math.round(p.highestScore)}%</td>
                            <td className="pe-3">{p.completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h2 className="h6 fw-bold mb-3">Category-wise Performance</h2>
                  <DonutChart data={categoryPerformance} centerLabel="Attempts" />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </AdminLayout>
  );
}
