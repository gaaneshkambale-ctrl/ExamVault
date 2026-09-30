import { useMemo } from 'react';
import { useExams, useExamTypes } from './useExams';
import { useAdminResultsForAllExams } from './useAdminResults';
import { useAttemptsByExam } from './useSubmissions';

// Shared join for every Exam Type Wise Report drill-down page: given a
// typeId, narrows exams/results/attempts down to just that type so each
// page doesn't repeat the same filter.
export function useExamTypeReportData(typeId: string | undefined) {
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const { data: examTypes, isLoading: isLoadingTypes } = useExamTypes();
  const examsOfType = useMemo(
    () => (exams ?? []).filter((e) => e.examTypeId === typeId),
    [exams, typeId],
  );
  const examIdsOfType = useMemo(() => examsOfType.map((e) => e.id), [examsOfType]);
  const { data: resultsOfType, isLoading: isLoadingResults } = useAdminResultsForAllExams(examsOfType);
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(examIdsOfType);
  const attemptsOfType = useMemo(
    () => Object.values(attemptsByExam).flat(),
    [attemptsByExam],
  );

  const examType = useMemo(() => (examTypes ?? []).find((t) => t.id === typeId), [examTypes, typeId]);

  return {
    examType,
    examsOfType,
    resultsOfType,
    attemptsOfType,
    isLoading: isLoadingExams || isLoadingTypes || isLoadingResults || isLoadingAttempts,
  };
}
