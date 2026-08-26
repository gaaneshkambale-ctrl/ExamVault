import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getQuestion,
  listQuestions,
  listQuestionsBySection,
  listUnassignedQuestions,
} from '../api/questionApi';

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

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: () => getQuestion(id!),
    enabled: !!id,
  });
}
