import { useQueries, useQuery } from '@tanstack/react-query';
import { getSection, listSections } from '../api/sectionApi';
import type { SectionResponse } from '../types/section';

export function useSections(examId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['sections', examId],
    queryFn: () => listSections(examId!),
    enabled: !!examId && enabled,
  });
}

// Same fan-out pattern as useQuestionsByExamIds/useAttemptsByExam - used by
// Exam Type Wise Report's Section Performance page to get every sectioned
// exam's section names in one go. Same query key as useSections, so it
// shares that cache entry instead of re-fetching.
export function useSectionsByExamIds(examIds: string[] | undefined) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['sections', examId],
      queryFn: () => listSections(examId),
    })),
  });

  const sectionsByExam: Record<string, SectionResponse[]> = {};
  ids.forEach((examId, index) => {
    sectionsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { sectionsByExam, isLoading };
}

export function useSection(examId: string | undefined, sectionId: string | undefined) {
  return useQuery({
    queryKey: ['sections', examId, sectionId],
    queryFn: () => getSection(examId!, sectionId!),
    enabled: !!examId && !!sectionId,
  });
}
