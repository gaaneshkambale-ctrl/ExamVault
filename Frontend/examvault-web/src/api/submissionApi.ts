import apiClient from './axiosClient';
import type { AttemptAnswerResponse, ExamAttemptResponse, SaveAnswerRequest } from '../types/submission';

export async function startAttempt(examId: string): Promise<ExamAttemptResponse> {
  const { data } = await apiClient.post<ExamAttemptResponse>('/api/submissions/start', { examId });
  return data;
}

export async function saveAnswer(
  attemptId: string,
  request: SaveAnswerRequest,
): Promise<AttemptAnswerResponse> {
  const { data } = await apiClient.put<AttemptAnswerResponse>(
    `/api/submissions/${attemptId}/answers`,
    request,
  );
  return data;
}
