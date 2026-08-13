import apiClient from './axiosClient';
import type {
  AssignmentListItemResponse,
  CreateAssignmentRequest,
  ExamAssignmentResponse,
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

export async function deleteAssignment(id: string): Promise<void> {
  await apiClient.delete(`/api/assignments/${id}`);
}
