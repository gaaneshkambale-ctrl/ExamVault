import apiClient from './axiosClient';
import type { CreateQuestionRequest, QuestionResponse } from '../types/question';

export async function createQuestion(request: CreateQuestionRequest): Promise<QuestionResponse> {
  const { data } = await apiClient.post<QuestionResponse>('/api/questions', request);
  return data;
}
