import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type { AdminAttemptResultResponse, ResultSummaryResponse } from '../types/result';

export async function getMyResult(examId: string): Promise<ResultSummaryResponse | null> {
  try {
    const { data } = await apiClient.get<ResultSummaryResponse>('/api/results', {
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

export async function getExamResultsForAdmin(examId: string): Promise<AdminAttemptResultResponse[]> {
  const { data } = await apiClient.get<AdminAttemptResultResponse[]>(`/api/results/by-exam/${examId}`);
  return data;
}
