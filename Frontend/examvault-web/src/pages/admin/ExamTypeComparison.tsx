import { useMemo, useState } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import ReportTabs from '../../components/reports/ReportTabs';
import ScoreDistributionChart from '../../components/ScoreDistributionChart';
import { TargetIcon } from '../../components/reports/ReportIcons';
import { DownloadIcon } from '../../components/icons/ActionIcons';
import { useExamTypeSummaryRows } from '../../hooks/useExamTypeSummaryRows';
import { useAttemptsByExam } from '../../hooks/useSubmissions';
import { useExams } from '../../hooks/useExams';
import { exportRowsToCsv } from '../../utils/exportCsv';
import { getDefaultRange } from '../../utils/dateRange';

const TABS = ['Average Score', 'Pass Percentage', 'Participants', 'Completion Rate', 'Attempts'];

export default function ExamTypeComparison() {
  const range = useMemo(() => getDefaultRange(365), []);
  const { rows, isLoading: isLoadingRows } = useExamTypeSummaryRows(range, 'All', 'All');
  const { data: exams } = useExams();
  const examIds = useMemo(() => (exams ?? []).map((e) => e.id), [exams]);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examIds);
  const [tab, setTab] = useState(TABS[0]);

  const loading = isLoadingRows || isLoadingAttempts;

  const completionByType = useMemo(() => {
    return rows.map((r) => {
      const typeExamIds = new Set((exams ?? []).filter((e) => e.examTypeId === r.type.id).map((e) => e.id));
      const attempts = Object.entries(attemptsByExam)
        .filter(([examId]) => typeExamIds.has(examId))
        .flatMap(([, list]) => list);
      const completed = attempts.filter((a) => a.status !== 'InProgress');
      return attempts.length === 0 ? 0 : Math.round((completed.length / attempts.length) * 100);
    });
  }, [rows, exams, attemptsByExam]);

  const attemptsByType = useMemo(() => {
    return rows.map((r) => {
      const typeExamIds = new Set((exams ?? []).filter((e) => e.examTypeId === r.type.id).map((e) => e.id));
      return Object.entries(attemptsByExam)
        .filter(([examId]) => typeExamIds.has(examId))
        .reduce((sum, [, list]) => sum + list.length, 0);
    });
  }, [rows, exams, attemptsByExam]);

  const chartData = useMemo(() => {
    const labels = rows.map((r) => r.type.name.replace(' Exam', ''));
    const valueFor: Record<string, number[]> = {
      'Average Score': rows.map((r) => Math.round(r.averageScore)),
      'Pass Percentage': rows.map((r) => Math.round(r.passPercentage)),
      Participants: rows.map((r) => r.participantsCount),
      'Completion Rate': completionByType,
      Attempts: attemptsByType,
    };
    return labels.map((label, i) => ({ label, count: valueFor[tab][i] ?? 0 }));
  }, [rows, tab, completionByType, attemptsByType]);

  const insight = useMemo(() => {
    const withData = chartData.filter((d) => d.count > 0);
    if (withData.length < 2) return null;
    const highest = withData.reduce((a, b) => (b.count > a.count ? b : a));
    const lowest = withData.reduce((a, b) => (b.count < a.count ? b : a));
    const suffix = tab === 'Participants' || tab === 'Attempts' ? '' : '%';
    return `${highest.label} Exam has the highest ${tab.toLowerCase()} (${highest.count}${suffix}) while ${lowest.label} Exam has the lowest (${lowest.count}${suffix}).`;
  }, [chartData, tab]);

  return (
    <AdminLayout active="Exam Type Wise Report">
      <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Reports / Exam Type Wise Report / Comparison</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Exam Type Comparison</h1>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
            onClick={() =>
              exportRowsToCsv(
                'exam-type-comparison',
                ['Exam Type', tab],
                chartData.map((d) => [d.label, d.count]),
              )
            }
          >
            <DownloadIcon size={14} /> Export
          </button>
          <Link to="/admin/reports/exam-type-wise" className="btn btn-outline-secondary btn-sm">
            &larr; Back to Overview
          </Link>
        </div>
      </div>
      <p className="text-muted mb-4">Compare performance across different exam types.</p>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && (
        <>
          <ReportTabs tabs={TABS} active={tab} onChange={setTab} />

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <SectionHeader icon={<TargetIcon />} title={`${tab} by Exam Type`} />
              <ScoreDistributionChart data={chartData} />
            </Card.Body>
          </Card>

          {insight && (
            <div className="alert alert-light border small mb-0">
              <strong>Insight:</strong> {insight}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
