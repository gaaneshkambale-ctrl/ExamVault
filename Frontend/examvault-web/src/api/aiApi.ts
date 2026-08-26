import apiClient from './axiosClient';
import type { DraftQuestion, GenerateQuestionsRequest } from '../types/ai';

export async function generateQuestions(request: GenerateQuestionsRequest): Promise<DraftQuestion[]> {
  const { data } = await apiClient.post<DraftQuestion[]>('/api/ai/generate-questions', request);
  return data;
}
