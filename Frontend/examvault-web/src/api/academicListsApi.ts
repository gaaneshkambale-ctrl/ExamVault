import apiClient from './axiosClient';
import type { AcademicListItem, AcademicListType, CreateAcademicListItemRequest } from '../types/academicListItem';

export async function getAcademicListItems(listType: AcademicListType, parentId: string | null): Promise<AcademicListItem[]> {
  const { data } = await apiClient.get<AcademicListItem[]>('/api/tenants/mine/academic-lists', {
    params: { listType, parentId: parentId ?? undefined },
  });
  return data;
}

export async function createAcademicListItem(request: CreateAcademicListItemRequest): Promise<AcademicListItem> {
  const { data } = await apiClient.post<AcademicListItem>('/api/tenants/mine/academic-lists', request);
  return data;
}

export async function deleteAcademicListItem(id: string): Promise<void> {
  await apiClient.delete(`/api/tenants/mine/academic-lists/${id}`);
}
