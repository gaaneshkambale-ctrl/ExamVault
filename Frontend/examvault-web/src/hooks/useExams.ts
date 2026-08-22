import { useQuery } from '@tanstack/react-query';
import {
  getExam,
  getExamDefaults,
  getGeneralSettings,
  getProctoringSettings,
  getReminderSettings,
  listExams,
} from '../api/examApi';

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

export function useReminderSettings() {
  return useQuery({
    queryKey: ['settings', 'reminders'],
    queryFn: getReminderSettings,
  });
}

export function useProctoringSettings() {
  return useQuery({
    queryKey: ['settings', 'proctoring'],
    queryFn: getProctoringSettings,
  });
}

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: getGeneralSettings,
  });
}

export function useExamDefaults() {
  return useQuery({
    queryKey: ['settings', 'exam-defaults'],
    queryFn: getExamDefaults,
  });
}
