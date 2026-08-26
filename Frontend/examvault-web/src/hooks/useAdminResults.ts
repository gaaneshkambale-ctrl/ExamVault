import { useQueries } from '@tanstack/react-query';
import { getExamResultsForAdmin } from '../api/resultApi';
import type { AdminAttemptResultResponse } from '../types/result';
import type { ExamResponse } from '../types/exam';

export function useAdminResultsForAllExams(exams: ExamResponse[] | undefined) {
  const queries = useQueries({
    queries: (exams ?? []).map((exam) => ({
      queryKey: ['results', 'byExam', exam.id],
      queryFn: () => getExamResultsForAdmin(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoading = (exams ?? []).length > 0 && queries.some((q) => q.isLoading);
  const results: AdminAttemptResultResponse[] = queries.flatMap((q) => q.data ?? []);

  return { data: results, isLoading };
}
