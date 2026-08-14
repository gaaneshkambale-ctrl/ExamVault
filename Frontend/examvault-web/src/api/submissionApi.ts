import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type {
  AttemptAnswerResponse,
  AttemptWithAnswersResponse,
  ExamAttemptResponse,
  SaveAnswerRequest,
} from '../types/submission';

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

export async function submitAttempt(
  attemptId: string,
  isAutoSubmitted: boolean,
): Promise<ExamAttemptResponse> {
  const { data } = await apiClient.post<ExamAttemptResponse>(
    `/api/submissions/${attemptId}/submit`,
    { isAutoSubmitted },
  );
  return data;
}

export async function getMyAttempt(examId: string): Promise<AttemptWithAnswersResponse | null> {
  try {
    const { data } = await apiClient.get<AttemptWithAnswersResponse>('/api/submissions/mine', {
      params: { examId },
    });
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getUserAttempts(userId: string): Promise<ExamAttemptResponse[]> {
  const { data } = await apiClient.get<ExamAttemptResponse[]>(`/api/submissions/by-user/${userId}`);
  return data;
}
