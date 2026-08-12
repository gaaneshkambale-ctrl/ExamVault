import apiClient from './axiosClient';
import type { CreateExamRequest, ExamResponse } from '../types/exam';

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
