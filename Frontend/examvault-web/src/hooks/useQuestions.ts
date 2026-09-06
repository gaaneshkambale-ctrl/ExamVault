import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getQuestion,
  listQuestions,
  listQuestionsBySection,
  listUnassignedQuestions,
} from '../api/questionApi';
import type { QuestionResponse } from '../types/question';

export function useQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'byExam', examId],
    queryFn: () => listQuestions(examId!),
    enabled: !!examId,
  });
}

export function useUnassignedQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'byExam', examId, 'unassigned'],
    queryFn: () => listUnassignedQuestions(examId!),
    enabled: !!examId,
  });
}

export function useQuestionsBySection(examId: string | undefined, sectionId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'byExam', examId, 'bySection', sectionId],
    queryFn: () => listQuestionsBySection(examId!, sectionId!),
    enabled: !!examId && !!sectionId,
  });
}

// exam.totalQuestions (from Exam Service) is a legacy field that's never
// kept in sync with Question Service, so it's always 0 - this computes the
// real per-exam count live, the same way student/ExamDetails.tsx and
// QuestionBank.tsx already do for a single exam / the full question list.
export function useQuestionCountsByExam(examIds: string[] | undefined) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['questions', 'byExam', examId],
      queryFn: () => listQuestions(examId),
    })),
  });

  const counts: Record<string, number> = {};
  ids.forEach((examId, index) => {
    counts[examId] = queries[index]?.data?.length ?? 0;
  });
  return counts;
}

// Same fan-out as useQuestionCountsByExam, but keeps the full per-exam
// question list (with each question's sectionId) instead of just a count -
// used by Exam Type Wise Report's Section Performance page to join scored
// questions back to the section they belong to. Same query key as
// useQuestions/useQuestionCountsByExam, so it shares their cache entry
// instead of re-fetching.
export function useQuestionsByExamIds(examIds: string[] | undefined) {
  const ids = examIds ?? [];
  const queries = useQueries({
    queries: ids.map((examId) => ({
      queryKey: ['questions', 'byExam', examId],
      queryFn: () => listQuestions(examId),
    })),
  });

  const questionsByExam: Record<string, QuestionResponse[]> = {};
  ids.forEach((examId, index) => {
    questionsByExam[examId] = queries[index]?.data ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);
  return { questionsByExam, isLoading };
}

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: () => getQuestion(id!),
    enabled: !!id,
  });
}
