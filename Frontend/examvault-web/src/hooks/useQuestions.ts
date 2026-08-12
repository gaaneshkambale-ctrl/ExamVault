import { useQuery } from '@tanstack/react-query';
import { getQuestion, listQuestions } from '../api/questionApi';

export function useQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'byExam', examId],
    queryFn: () => listQuestions(examId!),
    enabled: !!examId,
  });
}

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: () => getQuestion(id!),
    enabled: !!id,
  });
}
