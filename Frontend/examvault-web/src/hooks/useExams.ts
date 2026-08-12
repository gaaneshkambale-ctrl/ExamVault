import { useQuery } from '@tanstack/react-query';
import { getExam, listExams } from '../api/examApi';

export function useExams(enabled = true) {
  return useQuery({
    queryKey: ['exams'],
    queryFn: listExams,
    enabled,
  });
}

export function useExam(id: string | undefined) {
  return useQuery({
    queryKey: ['exams', id],
    queryFn: () => getExam(id!),
    enabled: !!id,
  });
}
