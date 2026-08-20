import apiClient from './axiosClient';
import type { CreateQuestionRequest, QuestionResponse, UpdateQuestionRequest } from '../types/question';

export async function createQuestion(request: CreateQuestionRequest): Promise<QuestionResponse> {
  const { data } = await apiClient.post<QuestionResponse>('/api/questions', request);
  return data;
}

export async function listQuestions(examId: string): Promise<QuestionResponse[]> {
  const { data } = await apiClient.get<QuestionResponse[]>('/api/questions', { params: { examId } });
  return data;
}

export async function listUnassignedQuestions(examId: string): Promise<QuestionResponse[]> {
  const { data } = await apiClient.get<QuestionResponse[]>('/api/questions', {
    params: { examId, unassignedOnly: true },
  });
  return data;
}

export async function listQuestionsBySection(
  examId: string,
  sectionId: string,
): Promise<QuestionResponse[]> {
  const { data } = await apiClient.get<QuestionResponse[]>('/api/questions', {
    params: { examId, sectionId },
  });
  return data;
}

export async function bulkAssignSection(
  sectionId: string | null,
  questionIds: string[],
): Promise<void> {
  await apiClient.put('/api/questions/bulk-assign-section', { sectionId, questionIds });
}

export async function getQuestion(id: string): Promise<QuestionResponse> {
  const { data } = await apiClient.get<QuestionResponse>(`/api/questions/${id}`);
  return data;
}

export async function updateQuestion(
  id: string,
  request: UpdateQuestionRequest,
): Promise<QuestionResponse> {
  const { data } = await apiClient.put<QuestionResponse>(`/api/questions/${id}`, request);
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiClient.delete(`/api/questions/${id}`);
}
