import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type {
  AttemptAnswerResponse,
  AttemptSectionStateResponse,
  AttemptWithAnswersResponse,
  ExamAttemptResponse,
  ProctoringViolationType,
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

// /live includes InProgress attempts, unlike the plain by-exam endpoint
// (Reports - Submitted/AutoSubmitted only) - needed for Live Monitoring.
export async function getExamAttempts(examId: string): Promise<ExamAttemptResponse[]> {
  const { data } = await apiClient.get<AttemptWithAnswersResponse[]>(`/api/submissions/by-exam/${examId}/live`);
  return data.map((a) => a.attempt);
}

// Same /live endpoint as getExamAttempts, but keeps the answers array too -
// Student Attempts needs per-attempt answered-question counts for its
// progress column, which the attempt-only shape above can't provide.
export async function getExamAttemptsWithAnswers(examId: string): Promise<AttemptWithAnswersResponse[]> {
  const { data } = await apiClient.get<AttemptWithAnswersResponse[]>(`/api/submissions/by-exam/${examId}/live`);
  return data;
}

// Best-effort proctoring signal - failures are swallowed by the caller, a
// broker/network hiccup here must never interrupt the student's exam.
export async function recordFullscreenExit(attemptId: string): Promise<void> {
  await apiClient.post(`/api/submissions/${attemptId}/fullscreen-exit`);
}

export async function recordProctoringViolation(
  attemptId: string,
  type: ProctoringViolationType,
): Promise<void> {
  await apiClient.post(`/api/submissions/${attemptId}/proctoring-violation`, { type });
}

export async function enterSection(
  attemptId: string,
  sectionId: string,
): Promise<AttemptSectionStateResponse> {
  const { data } = await apiClient.post<AttemptSectionStateResponse>(
    `/api/submissions/${attemptId}/sections/${sectionId}/enter`,
  );
  return data;
}

export async function completeSection(
  attemptId: string,
  sectionId: string,
): Promise<AttemptSectionStateResponse> {
  const { data } = await apiClient.post<AttemptSectionStateResponse>(
    `/api/submissions/${attemptId}/sections/${sectionId}/complete`,
  );
  return data;
}
