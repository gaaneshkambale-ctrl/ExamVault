import { useMemo } from 'react';
import { Card, Col, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import { useExam } from '../../hooks/useExams';
import { getExamResultsForAdmin } from '../../api/resultApi';

const DISTRIBUTION_BUCKETS = [
  { label: '0-20%', min: 0, max: 20 },
  { label: '20-40%', min: 20, max: 40 },
  { label: '40-60%', min: 40, max: 60 },
  { label: '60-80%', min: 60, max: 80 },
  { label: '80-100%', min: 80, max: 101 },
];

const WORST_QUESTIONS_LIMIT = 10;

export default function ExamReportDetails() {
  const { examId } = useParams<{ examId: string }>();
  const { data: exam, isLoading: isLoadingExam } = useExam(examId);
  const { data: attempts, isLoading: isLoadingResults, isError } = useQuery({
    queryKey: ['results', 'byExam', examId],
    queryFn: () => getExamResultsForAdmin(examId!),
    enabled: !!examId,
  });

  const loading = isLoadingExam || isLoadingResults;

  const stats = useMemo(() => {
    const rows = attempts ?? [];
    const totalAttempts = rows.length;
    const passCount = rows.filter((r) => r.passed).length;
    const percentages = rows.map((r) => (r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0));
    const averageScore =
      totalAttempts === 0 ? 0 : rows.reduce((sum, r) => sum + r.totalScore, 0) / totalAttempts;
    const averagePercentage =
      totalAttempts === 0 ? 0 : percentages.reduce((sum, p) => sum + p, 0) / totalAttempts;

    const distribution = DISTRIBUTION_BUCKETS.map((bucket) => ({
      label: bucket.label,
      count: percentages.filter((p) => p >= bucket.min && p < bucket.max).length,
    }));

    const questionStatsById = new Map<
      string,
      { questionText: string; correct: number; incorrect: number; unanswered: number }
    >();
    for (const attempt of rows) {
      for (const question of attempt.questions) {
        const entry = questionStatsById.get(question.questionId) ?? {
          questionText: question.questionText,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        };
        if (question.selectedOptionId === null) {
          entry.unanswered += 1;
        } else if (question.isCorrect) {
          entry.correct += 1;
        } else {
          entry.incorrect += 1;
        }
        questionStatsById.set(question.questionId, entry);
      }
    }
    const mostMissedQuestions = Array.from(questionStatsById.entries())
      .map(([questionId, s]) => {
        const total = s.correct + s.incorrect + s.unanswered;
        return {
          questionId,
          ...s,
          total,
          percentCorrect: total === 0 ? 0 : Math.round((s.correct / total) * 100),
        };
      })
      .sort((a, b) => a.percentCorrect - b.percentCorrect);

    return {
      totalAttempts,
      passCount,
      failCount: totalAttempts - passCount,
      passRate: totalAttempts === 0 ? 0 : Math.round((passCount / totalAttempts) * 100),
      averageScore: Math.round(averageScore * 10) / 10,
      averagePercentage: Math.round(averagePercentage),
      distribution,
      mostMissedQuestions,
    };
  }, [attempts]);

  return (
    <AdminLayout active="Exam Reports">
      <Link to="/admin/reports/exams" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Exam Reports
      </Link>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && isError && (
        <div className="text-center text-danger py-5">Couldn't load this report. Please try again.</div>
      )}

      {!loading && !isError && (
        <>
          <h1 className="h4 fw-bold mb-1 text-primary">{exam?.title ?? 'Exam Report'}</h1>
          <p className="text-muted mb-4">Performance report across every student attempt.</p>

          <Row className="g-3 mb-4">
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Attempts</div>
                  <div className="h4 fw-bold mb-0">{stats.totalAttempts}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Average Score</div>
                  <div className="h4 fw-bold mb-0 text-info">
                    {stats.totalAttempts === 0 ? '—' : `${stats.averageScore} (${stats.averagePercentage}%)`}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Pass Rate</div>
                  <div className="h4 fw-bold mb-0 text-success">
                    {stats.totalAttempts === 0 ? '—' : `${stats.passRate}%`}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Failed</div>
                  <div className="h4 fw-bold mb-0 text-danger">{stats.failCount}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Score Distribution</h2>
              <ScoreDistributionChart data={stats.distribution} />
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="p-4 pb-3">
                <h2 className="h6 fw-bold mb-0">Most Missed Questions</h2>
                {stats.mostMissedQuestions.length > WORST_QUESTIONS_LIMIT && (
                  <p className="text-muted small mb-0">
                    Showing the worst {WORST_QUESTIONS_LIMIT} of {stats.mostMissedQuestions.length} questions.
                  </p>
                )}
              </div>

              {stats.mostMissedQuestions.length === 0 && (
                <div className="text-center text-muted py-5">No attempts yet.</div>
              )}

              {stats.mostMissedQuestions.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Question</th>
                      <th style={{ width: 200 }}>% Correct</th>
                      <th>Correct</th>
                      <th>Incorrect</th>
                      <th className="pe-4">Unanswered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.mostMissedQuestions.slice(0, WORST_QUESTIONS_LIMIT).map((q) => (
                      <tr key={q.questionId}>
                        <td className="ps-4 fw-medium" style={{ maxWidth: 360 }}>
                          {q.questionText}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <ProgressBar
                              now={q.percentCorrect}
                              variant={q.percentCorrect < 50 ? 'danger' : q.percentCorrect < 75 ? 'warning' : 'success'}
                              style={{ width: 100, height: 8 }}
                            />
                            <span className="small text-muted">{q.percentCorrect}%</span>
                          </div>
                        </td>
                        <td>{q.correct}</td>
                        <td>{q.incorrect}</td>
                        <td className="pe-4">{q.unanswered}</td>
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
