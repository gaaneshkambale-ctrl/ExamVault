import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type { ResultSummaryResponse } from '../types/result';

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
