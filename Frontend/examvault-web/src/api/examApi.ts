import apiClient from './axiosClient';
import type {
  CreateExamRequest,
  CreateExamTypeRequest,
  ExamDefaultsResponse,
  ExamResponse,
  ExamTypeOption,
  ProctoringSettingsResponse,
  ReminderSettingsResponse,
  UpdateExamRequest,
  UpdateExamTypeRequest,
} from '../types/exam';

export async function createExam(request: CreateExamRequest): Promise<ExamResponse> {
  const { data } = await apiClient.post<ExamResponse>('/api/exams', request);
  return data;
}

export async function listExams(): Promise<ExamResponse[]> {
  const { data } = await apiClient.get<ExamResponse[]>('/api/exams');
  return data;
}

export async function getExam(id: string): Promise<ExamResponse> {
  const { data } = await apiClient.get<ExamResponse>(`/api/exams/${id}`);
  return data;
}

export async function updateExam(id: string, request: UpdateExamRequest): Promise<ExamResponse> {
  const { data } = await apiClient.put<ExamResponse>(`/api/exams/${id}`, request);
  return data;
}

export async function publishExam(id: string): Promise<ExamResponse> {
  const { data } = await apiClient.post<ExamResponse>(`/api/exams/${id}/publish`);
  return data;
}

export async function unpublishExam(id: string): Promise<ExamResponse> {
  const { data } = await apiClient.post<ExamResponse>(`/api/exams/${id}/unpublish`);
  return data;
}

export async function archiveExam(id: string): Promise<ExamResponse> {
  const { data } = await apiClient.post<ExamResponse>(`/api/exams/${id}/archive`);
  return data;
}

export async function deleteExam(id: string): Promise<void> {
  await apiClient.delete(`/api/exams/${id}`);
}

export async function listExamTypes(): Promise<ExamTypeOption[]> {
  const { data } = await apiClient.get<ExamTypeOption[]>('/api/exam-types');
  return data;
}

export async function createExamType(request: CreateExamTypeRequest): Promise<ExamTypeOption> {
  const { data } = await apiClient.post<ExamTypeOption>('/api/exam-types', request);
  return data;
}

export async function updateExamType(id: string, request: UpdateExamTypeRequest): Promise<ExamTypeOption> {
  const { data } = await apiClient.put<ExamTypeOption>(`/api/exam-types/${id}`, request);
  return data;
}

export async function deleteExamType(id: string): Promise<void> {
  await apiClient.delete(`/api/exam-types/${id}`);
}

export async function getReminderSettings(): Promise<ReminderSettingsResponse> {
  const { data } = await apiClient.get<ReminderSettingsResponse>('/api/exams/reminder-settings');
  return data;
}

export async function updateReminderSettings(
  request: ReminderSettingsResponse,
): Promise<ReminderSettingsResponse> {
  const { data } = await apiClient.put<ReminderSettingsResponse>('/api/exams/reminder-settings', request);
  return data;
}

export async function getProctoringSettings(): Promise<ProctoringSettingsResponse> {
  const { data } = await apiClient.get<ProctoringSettingsResponse>('/api/exams/proctoring-settings');
  return data;
}

export async function updateProctoringSettings(
  request: ProctoringSettingsResponse,
): Promise<ProctoringSettingsResponse> {
  const { data } = await apiClient.put<ProctoringSettingsResponse>('/api/exams/proctoring-settings', request);
  return data;
}

export async function getExamDefaults(): Promise<ExamDefaultsResponse> {
  const { data } = await apiClient.get<ExamDefaultsResponse>('/api/exams/defaults');
  return data;
}

export async function updateExamDefaults(
  request: Omit<ExamDefaultsResponse, 'updatedAtUtc'>,
): Promise<ExamDefaultsResponse> {
  const { data } = await apiClient.put<ExamDefaultsResponse>('/api/exams/defaults', request);
  return data;
}
