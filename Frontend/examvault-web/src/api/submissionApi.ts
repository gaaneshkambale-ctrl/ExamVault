import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type {
  AttemptAnswerResponse,
  AttemptSectionStateResponse,
  AttemptWithAnswersResponse,
  ExamAttemptResponse,
  ProctoringViolationType,
  SaveAnswerRequest,
  ViolationEventResponse,
  ViolationStatus,
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

export interface JoinRecordingResponse {
  roomUrl: string | null;
  token: string | null;
}

// Called once the student's camera is ready - both fields come back null
// (not an error) when proctoring isn't enabled for this assignment, or the
// video provider is unconfigured/unreachable. The caller just skips joining
// a room in that case; the exam itself is unaffected either way.
export async function joinRecording(attemptId: string): Promise<JoinRecordingResponse> {
  const { data } = await apiClient.post<JoinRecordingResponse>(`/api/submissions/${attemptId}/recording/join`);
  return data;
}

export async function recordProctoringViolation(
  attemptId: string,
  type: ProctoringViolationType,
): Promise<void> {
  await apiClient.post(`/api/submissions/${attemptId}/proctoring-violation`, { type });
}

// Every individual violation occurrence for the exam (own timestamp,
// severity, investigate/resolve status) - unlike the by-exam/live attempts
// endpoint, which only carries running *Count totals with no per-event data.
export async function getExamViolations(examId: string): Promise<ViolationEventResponse[]> {
  const { data } = await apiClient.get<ViolationEventResponse[]>(`/api/submissions/by-exam/${examId}/violations`);
  return data;
}

export async function updateViolationStatus(violationId: string, status: ViolationStatus): Promise<void> {
  await apiClient.put(`/api/submissions/violations/${violationId}/status`, { status });
}

// Live Monitoring's "End Session" - admin ends a student's attempt on their
// behalf (same terminal AutoSubmitted state the exam timer produces).
export async function forceSubmitAttempt(attemptId: string): Promise<ExamAttemptResponse> {
  const { data } = await apiClient.post<ExamAttemptResponse>(`/api/submissions/${attemptId}/force-submit`);
  return data;
}

// Live Monitoring's per-card "Live" switch - grants/revokes an admin's
// authority to watch this one attempt's camera feed. Off by default even
// when proctoring is enabled; watchRecording below will refuse to issue a
// token until this has been turned on for the attempt in question.
export async function setLiveWatchEnabled(attemptId: string, enabled: boolean): Promise<boolean> {
  const { data } = await apiClient.put<{ liveWatchEnabled: boolean }>(
    `/api/submissions/${attemptId}/live-watch`,
    { enabled },
  );
  return data.liveWatchEnabled;
}

// Admin's side of the same Metered room the student's own client publishes
// into via joinRecording. Both fields come back null (200, not an error)
// whenever live-watch hasn't been granted for this attempt, proctoring was
// never enabled for the student, or the video provider is unreachable - the
// caller just shows "nothing to watch" in every case.
export async function watchRecording(attemptId: string): Promise<JoinRecordingResponse> {
  const { data } = await apiClient.post<JoinRecordingResponse>(`/api/submissions/${attemptId}/recording/watch`);
  return data;
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
