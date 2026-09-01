import { useMemo, useState } from 'react';
import { Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ReportStatCard from '../../components/reports/ReportStatCard';
import ReportTabs from '../../components/reports/ReportTabs';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import DonutChart from '../../components/charts/DonutChart';
import LineTrendChart from '../../components/charts/LineTrendChart';
import { BookIcon, UserCheckIcon, TargetIcon, CheckCircleIcon, FlagIcon } from '../../components/reports/ReportIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';
import { getExamResultScheme } from '../../utils/examResultScheme';
import type { AdminAttemptResultResponse } from '../../types/result';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

const DISTRIBUTION_BUCKETS = [
  { label: '0-20', min: 0, max: 20 },
  { label: '21-40', min: 20, max: 40 },
  { label: '41-60', min: 40, max: 60 },
  { label: '61-80', min: 60, max: 80 },
  { label: '81-100', min: 80, max: 101 },
];

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export default function ExamTypePerformanceAnalysis() {
  const { typeId } = useParams<{ typeId: string }>();
  const { examType, examsOfType, resultsOfType, attemptsOfType, isLoading } = useExamTypeReportData(typeId);
  const scheme = getExamResultScheme(examType?.name);
  const outcomeTabLabel = `${scheme.outcomeLabels.pass} vs ${scheme.outcomeLabels.fail}`;
  const tabs = useMemo(
    () => [
      'Score Distribution',
      ...(scheme.hasPassFailConcept ? [outcomeTabLabel] : []),
      'Average Score Trend',
      'Completion Rate',
      'Top Performing Exams',
    ],
    [scheme.hasPassFailConcept, outcomeTabLabel],
  );
  const [tab, setTab] = useState(tabs[0]);

  const percentages = useMemo(() => (resultsOfType ?? []).map(percentOf), [resultsOfType]);
  const passCount = useMemo(() => (resultsOfType ?? []).filter((r) => r.passed).length, [resultsOfType]);
  const failCount = (resultsOfType?.length ?? 0) - passCount;

  const stats = useMemo(() => {
    const attemptsStarted = attemptsOfType;
    const attemptsCompleted = attemptsStarted.filter((a) => a.status !== 'InProgress');
    return {
      totalExams: examsOfType.length,
      totalParticipants: resultsOfType?.length ?? 0,
      averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
      passPercentage: (resultsOfType?.length ?? 0) === 0 ? 0 : (passCount / (resultsOfType?.length ?? 1)) * 100,
      completionRate: attemptsStarted.length === 0 ? 0 : (attemptsCompleted.length / attemptsStarted.length) * 100,
    };
  }, [examsOfType, resultsOfType, percentages, passCount, attemptsOfType]);

  const distribution = useMemo(
    () =>
      DISTRIBUTION_BUCKETS.map((b) => ({
        label: b.label,
        count: percentages.filter((p) => p >= b.min && p < b.max).length,
      })),
    [percentages],
  );

  const scoreSummary = useMemo(
    () => ({
      highest: percentages.length === 0 ? 0 : Math.max(...percentages),
      lowest: percentages.length === 0 ? 0 : Math.min(...percentages),
      average: stats.averageScore,
      median: median(percentages),
      stdDev: standardDeviation(percentages),
    }),
    [percentages, stats.averageScore],
  );

  const insights = useMemo(() => {
    const total = percentages.length;
    if (total === 0) return ['No attempts yet for this exam type.'];
    const above60 = percentages.filter((p) => p >= 60).length;
    const below40 = percentages.filter((p) => p < 40).length;
    const list = [
      `${Math.round((above60 / total) * 100)}% of participants scored above 60%`,
      `${Math.round((below40 / total) * 100)}% of participants scored below 40%`,
    ];
    if (below40 / total > 0.2) list.push('A notable share of attempts need improvement in the 0-40 score range.');
    return list;
  }, [percentages]);

  const trendSeries = useMemo(() => {
    const byDay = new Map<string, { sum: number; count: number }>();
    for (const r of resultsOfType ?? []) {
      if (!r.submittedAtUtc) continue;
      const key = r.submittedAtUtc.slice(0, 10);
      const entry = byDay.get(key) ?? { sum: 0, count: 0 };
      entry.sum += percentOf(r);
      entry.count += 1;
      byDay.set(key, entry);
    }
    const sortedKeys = Array.from(byDay.keys()).sort();
    return sortedKeys.map((key) => ({
      label: new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(byDay.get(key)!.sum / byDay.get(key)!.count),
    }));
  }, [resultsOfType]);

  const completionByExam = useMemo(() => {
    return examsOfType.map((exam) => {
      const attempts = attemptsOfType.filter((a) => a.examId === exam.id);
      const completed = attempts.filter((a) => a.status !== 'InProgress');
      return {
        label: exam.title.length > 14 ? `${exam.title.slice(0, 14)}…` : exam.title,
        count: attempts.length === 0 ? 0 : Math.round((completed.length / attempts.length) * 100),
      };
    });
  }, [examsOfType, attemptsOfType]);

  const topPerformingExams = useMemo(() => {
    const resultsByExamId = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of resultsOfType ?? []) {
      const list = resultsByExamId.get(r.examId) ?? [];
      list.push(r);
      resultsByExamId.set(r.examId, list);
    }
    return examsOfType
      .map((exam) => {
        const results = resultsByExamId.get(exam.id) ?? [];
        const pcts = results.map(percentOf);
        const passN = results.filter((r) => r.passed).length;
        return {
          exam,
          averageScore: pcts.length === 0 ? 0 : pcts.reduce((a, b) => a + b, 0) / pcts.length,
          participants: results.length,
          passPercentage: results.length === 0 ? 0 : (passN / results.length) * 100,
        };
      })
      .filter((r) => r.participants > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [examsOfType, resultsOfType]);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / Exam Type Wise Report / Performance Analysis</p>
          <h1 className="h4 fw-bold mb-1 text-primary">
            Performance Analysis{examType ? ` – ${examType.name}` : ''}
          </h1>
        </div>
        <Link to={`/admin/reports/exam-type/${typeId}`} className="btn btn-outline-secondary btn-sm">
          &larr; Back to Details
        </Link>
      </div>
      <p className="text-muted mb-4">In-depth performance insights{examType ? ` for ${examType.name}` : ''}.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<BookIcon />} label="Total Exams" value={String(stats.totalExams)} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<UserCheckIcon />} label="Total Participants" value={stats.totalParticipants.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard icon={<TargetIcon />} label="Average Score" value={`${stats.averageScore.toFixed(2)}%`} />
            </Col>
            {scheme.hasPassFailConcept && (
              <Col md={4} lg>
                <ReportStatCard
                  icon={<CheckCircleIcon />}
                  label={`${scheme.outcomeLabels.pass} Percentage`}
                  value={`${stats.passPercentage.toFixed(2)}%`}
                />
              </Col>
            )}
            <Col md={4} lg>
              <ReportStatCard icon={<FlagIcon />} label="Completion Rate" value={`${stats.completionRate.toFixed(2)}%`} />
            </Col>
          </Row>

          <ReportTabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === 'Score Distribution' && (
            <Row className="g-3">
              <Col lg={8}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Score Distribution</h2>
                    <ScoreDistributionChart data={distribution} />
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4}>
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Score Summary</h2>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Highest Score</span>
                      <span className="fw-medium">{Math.round(scoreSummary.highest)}%</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Lowest Score</span>
                      <span className="fw-medium">{Math.round(scoreSummary.lowest)}%</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Average Score</span>
                      <span className="fw-medium">{Math.round(scoreSummary.average)}%</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Median Score</span>
                      <span className="fw-medium">{Math.round(scoreSummary.median)}%</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Standard Deviation</span>
                      <span className="fw-medium">{scoreSummary.stdDev.toFixed(2)}</span>
                    </div>
                  </Card.Body>
                </Card>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <h2 className="h6 fw-bold mb-3">Insights</h2>
                    <ul className="small text-muted mb-0 ps-3">
                      {insights.map((line) => (
                        <li key={line} className="mb-1">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {tab === outcomeTabLabel && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">{outcomeTabLabel}</h2>
                <DonutChart
                  data={[
                    { label: scheme.outcomeLabels.pass, value: passCount, color: '#22c55e' },
                    { label: scheme.outcomeLabels.fail, value: failCount, color: '#ef4444' },
                  ]}
                  centerLabel="Attempts"
                />
              </Card.Body>
            </Card>
          )}

          {tab === 'Average Score Trend' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">Average Score Trend</h2>
                {trendSeries.length === 0 ? (
                  <div className="text-center text-muted py-5 small">Not enough data yet.</div>
                ) : (
                  <LineTrendChart
                    series={[{ name: 'Average Score %', color: '#4f46e5', data: trendSeries, isPercent: true }]}
                  />
                )}
              </Card.Body>
            </Card>
          )}

          {tab === 'Completion Rate' && (
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h2 className="h6 fw-bold mb-3">Completion Rate by Exam</h2>
                <ScoreDistributionChart data={completionByExam} />
              </Card.Body>
            </Card>
          )}

          {tab === 'Top Performing Exams' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <h2 className="h6 fw-bold p-3 pb-2 mb-0">Top Performing Exams</h2>
                {topPerformingExams.length === 0 ? (
                  <div className="text-center text-muted py-5">No attempts yet.</div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-light">
                      <tr>
                        <th className="ps-4">Exam</th>
                        <th>Average Score</th>
                        <th>Participants</th>
                        {scheme.hasPassFailConcept && <th className="pe-4">{scheme.outcomeLabels.pass} %</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformingExams.map((r) => (
                        <tr key={r.exam.id}>
                          <td className="ps-4 fw-medium">{r.exam.title}</td>
                          <td>{Math.round(r.averageScore)}%</td>
                          <td>{r.participants.toLocaleString()}</td>
                          {scheme.hasPassFailConcept && <td className="pe-4">{Math.round(r.passPercentage)}%</td>}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}
