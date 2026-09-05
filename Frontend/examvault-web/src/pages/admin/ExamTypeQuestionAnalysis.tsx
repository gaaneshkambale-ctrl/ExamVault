import { useMemo, useState } from 'react';
import { Card, Col, ProgressBar, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportStatCard from '../../components/reports/ReportStatCard';
import ReportTabs from '../../components/reports/ReportTabs';
import DonutChart from '../../components/charts/DonutChart';
import { BookIcon, CheckCircleIcon, XCircleIcon, MinusCircleIcon } from '../../components/reports/ReportIcons';
import { useExamTypeReportData } from '../../hooks/useExamTypeReportData';

const TABS = ['Overall Analysis', 'Most Difficult Questions', 'Most Skipped Questions'];
const WORST_LIMIT = 10;

interface QuestionAgg {
  questionId: string;
  questionText: string;
  examTitle: string;
  correct: number;
  incorrect: number;
  unanswered: number;
}

export default function ExamTypeQuestionAnalysis() {
  const { typeId } = useParams<{ typeId: string }>();
  const { examType, resultsOfType, isLoading } = useExamTypeReportData(typeId);
  const [tab, setTab] = useState(TABS[0]);

  const totals = useMemo(() => {
    let total = 0;
    let attempted = 0;
    let correct = 0;
    for (const attempt of resultsOfType ?? []) {
      for (const q of attempt.questions) {
        total += 1;
        if (q.selectedOptionId !== null) {
          attempted += 1;
          if (q.isCorrect) correct += 1;
        }
      }
    }
    const incorrect = attempted - correct;
    const skipped = total - attempted;
    return { total, attempted, correct, incorrect, skipped };
  }, [resultsOfType]);

  const questionAggs = useMemo(() => {
    const byId = new Map<string, QuestionAgg>();
    for (const attempt of resultsOfType ?? []) {
      for (const q of attempt.questions) {
        const entry = byId.get(q.questionId) ?? {
          questionId: q.questionId,
          questionText: q.questionText,
          examTitle: attempt.examTitle,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        };
        if (q.selectedOptionId === null) entry.unanswered += 1;
        else if (q.isCorrect) entry.correct += 1;
        else entry.incorrect += 1;
        byId.set(q.questionId, entry);
      }
    }
    return Array.from(byId.values()).map((q) => {
      const attempts = q.correct + q.incorrect + q.unanswered;
      return {
        ...q,
        attempts,
        percentCorrect: attempts === 0 ? 0 : Math.round((q.correct / attempts) * 100),
        percentSkipped: attempts === 0 ? 0 : Math.round((q.unanswered / attempts) * 100),
      };
    });
  }, [resultsOfType]);

  const mostDifficult = useMemo(
    () => [...questionAggs].sort((a, b) => a.percentCorrect - b.percentCorrect).slice(0, WORST_LIMIT),
    [questionAggs],
  );
  const mostSkipped = useMemo(
    () => [...questionAggs].filter((q) => q.unanswered > 0).sort((a, b) => b.percentSkipped - a.percentSkipped).slice(0, WORST_LIMIT),
    [questionAggs],
  );

  const summary = useMemo(() => {
    const withAttempts = questionAggs.filter((q) => q.attempts > 0);
    const easiest = withAttempts.length === 0 ? null : withAttempts.reduce((a, b) => (b.percentCorrect > a.percentCorrect ? b : a));
    const hardest = withAttempts.length === 0 ? null : withAttempts.reduce((a, b) => (b.percentCorrect < a.percentCorrect ? b : a));
    const perfect = withAttempts.filter((q) => q.percentCorrect === 100).length;
    return {
      averageDifficultyPercent: withAttempts.length === 0 ? 0 : withAttempts.reduce((s, q) => s + q.percentCorrect, 0) / withAttempts.length,
      easiest,
      hardest,
      totalAttemptsAnalyzed: resultsOfType?.length ?? 0,
      perfectQuestions: perfect,
    };
  }, [questionAggs, resultsOfType]);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / Exam Type Wise Report / Question Analysis</p>
          <h1 className="h4 fw-bold mb-1 text-primary">
            Question Analysis{examType ? ` – ${examType.name}` : ''}
          </h1>
        </div>
        <Link to={`/admin/reports/exam-type/${typeId}`} className="btn btn-outline-secondary btn-sm">
          &larr; Back to Details
        </Link>
      </div>
      <p className="text-muted mb-4">
        Analyze question performance across all {examType ? examType.name.toLowerCase() : ''} exams.
      </p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (
        <>
          <Row className="g-3 mb-4">
            <Col md={4} lg>
              <ReportStatCard icon={<BookIcon />} label="Total Questions" value={totals.total.toLocaleString()} />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Attempted"
                value={totals.attempted.toLocaleString()}
                caption={totals.total === 0 ? undefined : `${Math.round((totals.attempted / totals.total) * 100)}% of total`}
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<CheckCircleIcon />}
                label="Correct"
                value={totals.correct.toLocaleString()}
                caption={totals.attempted === 0 ? undefined : `${Math.round((totals.correct / totals.attempted) * 100)}% of attempted`}
                iconBg="#f0fdf4"
                iconColor="#16a34a"
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<XCircleIcon />}
                label="Incorrect"
                value={totals.incorrect.toLocaleString()}
                caption={totals.attempted === 0 ? undefined : `${Math.round((totals.incorrect / totals.attempted) * 100)}% of attempted`}
                iconBg="#fef2f2"
                iconColor="#dc2626"
              />
            </Col>
            <Col md={4} lg>
              <ReportStatCard
                icon={<MinusCircleIcon />}
                label="Skipped"
                value={totals.skipped.toLocaleString()}
                caption={totals.total === 0 ? undefined : `${Math.round((totals.skipped / totals.total) * 100)}% of total`}
                iconBg="#f9fafb"
                iconColor="#6b7280"
              />
            </Col>
          </Row>

          <ReportTabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'Overall Analysis' && (
            <Row className="g-3">
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <SectionHeader icon={<BookIcon />} title="Overall Question Performance" />
                    <DonutChart
                      data={[
                        { label: 'Correct', value: totals.correct, color: '#22c55e' },
                        { label: 'Incorrect', value: totals.incorrect, color: '#ef4444' },
                      ]}
                      centerLabel="Correct"
                    />
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <SectionHeader icon={<CheckCircleIcon />} title="Question Performance Summary" />
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Average Correct Rate</span>
                      <span className="fw-medium">{summary.averageDifficultyPercent.toFixed(2)}%</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Easiest Question</span>
                      <span className="fw-medium text-truncate ms-2" style={{ maxWidth: 220 }}>
                        {summary.easiest ? `${summary.easiest.percentCorrect}% Correct` : '—'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Hardest Question</span>
                      <span className="fw-medium text-truncate ms-2" style={{ maxWidth: 220 }}>
                        {summary.hardest ? `${summary.hardest.percentCorrect}% Correct` : '—'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">Total Attempts Analyzed</span>
                      <span className="fw-medium">{summary.totalAttemptsAnalyzed.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Questions with 100% Correct</span>
                      <span className="fw-medium">{summary.perfectQuestions.toLocaleString()}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {tab === 'Most Difficult Questions' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <div className="p-3 pb-0">
                  <SectionHeader icon={<XCircleIcon />} title={`Top ${WORST_LIMIT} Most Difficult Questions`} />
                </div>
                {mostDifficult.length === 0 ? (
                  <div className="text-center text-muted py-5">No attempts yet.</div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-body-tertiary">
                      <tr>
                        <th className="ps-4">#</th>
                        <th>Question</th>
                        <th>From Exam</th>
                        <th style={{ width: 160 }}>Correct %</th>
                        <th className="pe-4">Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostDifficult.map((q, i) => (
                        <tr key={q.questionId}>
                          <td className="ps-4">{i + 1}</td>
                          <td style={{ maxWidth: 360 }}>{q.questionText}</td>
                          <td className="text-muted">{q.examTitle}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <ProgressBar
                                now={q.percentCorrect}
                                variant={q.percentCorrect < 50 ? 'danger' : q.percentCorrect < 75 ? 'warning' : 'success'}
                                style={{ width: 80, height: 8 }}
                              />
                              <span className="small text-muted">{q.percentCorrect}%</span>
                            </div>
                          </td>
                          <td className="pe-4">{q.attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          {tab === 'Most Skipped Questions' && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <div className="p-3 pb-0">
                  <SectionHeader icon={<MinusCircleIcon />} title={`Top ${WORST_LIMIT} Most Skipped Questions`} />
                </div>
                {mostSkipped.length === 0 ? (
                  <div className="text-center text-muted py-5">No skipped questions.</div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-body-tertiary">
                      <tr>
                        <th className="ps-4">#</th>
                        <th>Question</th>
                        <th>From Exam</th>
                        <th style={{ width: 160 }}>Skipped %</th>
                        <th className="pe-4">Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostSkipped.map((q, i) => (
                        <tr key={q.questionId}>
                          <td className="ps-4">{i + 1}</td>
                          <td style={{ maxWidth: 360 }}>{q.questionText}</td>
                          <td className="text-muted">{q.examTitle}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <ProgressBar now={q.percentSkipped} variant="secondary" style={{ width: 80, height: 8 }} />
                              <span className="small text-muted">{q.percentSkipped}%</span>
                            </div>
                          </td>
                          <td className="pe-4">{q.attempts}</td>
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
