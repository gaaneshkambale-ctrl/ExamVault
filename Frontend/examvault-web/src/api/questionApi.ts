import apiClient from './axiosClient';
import type { CreateQuestionRequest, QuestionResponse } from '../types/question';

export async function createQuestion(request: CreateQuestionRequest): Promise<QuestionResponse> {
  const { data } = await apiClient.post<QuestionResponse>('/api/questions', request);
  return data;
}

export async function listQuestions(examId: string): Promise<QuestionResponse[]> {
  const { data } = await apiClient.get<QuestionResponse[]>('/api/questions', { params: { examId } });
  return data;
}

export async function getQuestion(id: string): Promise<QuestionResponse> {
  const { data } = await apiClient.get<QuestionResponse>(`/api/questions/${id}`);
  return data;
}
