import { useMemo } from 'react';
import { useExams, useExamTypes } from './useExams';
import { useAdminResultsForAllExams } from './useAdminResults';
import type { ExamStatus } from '../types/exam';
import type { DateRange } from '../utils/dateRange';
import { isWithinRange } from '../utils/dateRange';
import type { AdminAttemptResultResponse } from '../types/result';

function percentOf(r: AdminAttemptResultResponse): number {
  return r.totalMarks > 0 ? (r.totalScore / r.totalMarks) * 100 : 0;
}

export interface ExamTypeSummaryRow {
  type: { id: string; name: string; purpose: string | null };
  examsCount: number;
  participantsCount: number;
  averageScore: number;
  passPercentage: number;
  topScore: number;
  lowestScore: number;
}

// Shared "one row per exam type" aggregation used by both the Overview
// table and the Comparison page's bar charts, so the two screens always
// agree on the same numbers - extracted from ExamTypeWiseReport.tsx's
// original inline useMemo.
export function useExamTypeSummaryRows(range: DateRange, category: string, status: 'All' | ExamStatus) {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: examTypes, isLoading: isLoadingTypes } = useExamTypes();
  const { data: allResults, isLoading: isLoadingResults } = useAdminResultsForAllExams(exams);

  const filteredExams = useMemo(
    () =>
      (exams ?? []).filter(
        (e) => (category === 'All' || e.category === category) && (status === 'All' || e.status === status),
      ),
    [exams, category, status],
  );

  const rows = useMemo<ExamTypeSummaryRow[]>(() => {
    const resultsByExamId = new Map<string, AdminAttemptResultResponse[]>();
    for (const r of allResults ?? []) {
      if (!isWithinRange(r.submittedAtUtc, range)) continue;
      const list = resultsByExamId.get(r.examId) ?? [];
      list.push(r);
      resultsByExamId.set(r.examId, list);
    }

    return (examTypes ?? []).map((type) => {
      const examsOfType = filteredExams.filter((e) => e.examTypeId === type.id);
      const results = examsOfType.flatMap((e) => resultsByExamId.get(e.id) ?? []);
      const percentages = results.map(percentOf);
      const passCount = results.filter((r) => r.passed).length;
      return {
        type,
        examsCount: examsOfType.length,
        participantsCount: results.length,
        averageScore: percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length,
        passPercentage: results.length === 0 ? 0 : (passCount / results.length) * 100,
        topScore: percentages.length === 0 ? 0 : Math.max(...percentages),
        lowestScore: percentages.length === 0 ? 0 : Math.min(...percentages),
      };
    });
  }, [examTypes, filteredExams, allResults, range]);

  const totalParticipants = useMemo(() => rows.reduce((sum, r) => sum + r.participantsCount, 0), [rows]);
  const overallAverageScore = useMemo(() => {
    const allInRangeResults = rows.length === 0 ? [] : (allResults ?? []).filter((r) => isWithinRange(r.submittedAtUtc, range));
    const filteredExamIds = new Set(filteredExams.map((e) => e.id));
    const percentages = allInRangeResults.filter((r) => filteredExamIds.has(r.examId)).map(percentOf);
    return percentages.length === 0 ? 0 : percentages.reduce((a, b) => a + b, 0) / percentages.length;
  }, [rows, allResults, range, filteredExams]);

  return {
    rows,
    filteredExams,
    examTypes: examTypes ?? [],
    totalParticipants,
    overallAverageScore,
    isLoading: isLoadingExams || isLoadingTypes || isLoadingResults,
  };
}
