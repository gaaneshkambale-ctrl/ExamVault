import { isAxiosError } from 'axios';
import apiClient from './axiosClient';
import type {
  AssignmentListItemResponse,
  CreateAssignmentRequest,
  ExamAssignmentResponse,
  MyAssignmentResponse,
  UpdateAssignmentRequest,
} from '../types/assignment';

export async function listAllAssignments(): Promise<AssignmentListItemResponse[]> {
  const { data } = await apiClient.get<AssignmentListItemResponse[]>('/api/assignments');
  return data;
}

export async function listAssignmentsForExam(examId: string): Promise<ExamAssignmentResponse[]> {
  const { data } = await apiClient.get<ExamAssignmentResponse[]>('/api/assignments', {
    params: { examId },
  });
  return data;
}

export async function getAssignment(id: string): Promise<ExamAssignmentResponse> {
  const { data } = await apiClient.get<ExamAssignmentResponse>(`/api/assignments/${id}`);
  return data;
}

export async function createAssignment(request: CreateAssignmentRequest): Promise<ExamAssignmentResponse> {
  const { data } = await apiClient.post<ExamAssignmentResponse>('/api/assignments', request);
  return data;
}

export async function updateAssignment(
  id: string,
  request: UpdateAssignmentRequest,
): Promise<ExamAssignmentResponse> {
  const { data } = await apiClient.put<ExamAssignmentResponse>(`/api/assignments/${id}`, request);
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiClient.delete(`/api/assignments/${id}`);
}

// Distinct from deleteAssignment: keeps the row (delete hard-removes it
// and cascades its targets) so a cancelled sitting still shows on the
// Exam Scheduled list.
export async function cancelAssignment(id: string): Promise<void> {
  await apiClient.post(`/api/assignments/${id}/cancel`);
}

export async function getMyAssignmentForExam(examId: string): Promise<MyAssignmentResponse | null> {
  try {
    const { data } = await apiClient.get<MyAssignmentResponse>('/api/assignments/mine', {
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
