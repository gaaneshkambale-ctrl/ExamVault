import apiClient from './axiosClient';
import type { CreateExamRequest, ExamResponse, UpdateExamRequest } from '../types/exam';

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
