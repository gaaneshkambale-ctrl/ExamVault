import apiClient from './axiosClient';
import type { PlatformSectionResponse, SectionOrderItem, SectionRequest, SectionResponse } from '../types/section';

export async function listSections(examId: string): Promise<SectionResponse[]> {
  const { data } = await apiClient.get<SectionResponse[]>(`/api/exams/${examId}/sections`);
  return data;
}

export async function getSection(examId: string, sectionId: string): Promise<SectionResponse> {
  const { data } = await apiClient.get<SectionResponse>(`/api/exams/${examId}/sections/${sectionId}`);
  return data;
}

export async function getOrCreateDefaultSection(examId: string): Promise<SectionResponse> {
  const { data } = await apiClient.get<SectionResponse>(`/api/exams/${examId}/sections/default`);
  return data;
}

export async function createSection(examId: string, request: SectionRequest): Promise<SectionResponse> {
  const { data } = await apiClient.post<SectionResponse>(`/api/exams/${examId}/sections`, request);
  return data;
}

export async function updateSection(
  examId: string,
  sectionId: string,
  request: SectionRequest,
): Promise<SectionResponse> {
  const { data } = await apiClient.put<SectionResponse>(
    `/api/exams/${examId}/sections/${sectionId}`,
    request,
  );
  return data;
}

export async function deleteSection(examId: string, sectionId: string): Promise<void> {
  await apiClient.delete(`/api/exams/${examId}/sections/${sectionId}`);
}

export async function reorderSections(examId: string, order: SectionOrderItem[]): Promise<void> {
  await apiClient.put(`/api/exams/${examId}/sections/reorder`, { order });
}

export async function listAllSections(): Promise<PlatformSectionResponse[]> {
  const { data } = await apiClient.get<PlatformSectionResponse[]>('/api/exams/sections');
  return data;
}
