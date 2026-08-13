import apiClient from './axiosClient';
import type { AddGroupMemberRequest, CreateGroupRequest, GroupDetailResponse, GroupResponse } from '../types/group';

export async function listGroups(): Promise<GroupResponse[]> {
  const { data } = await apiClient.get<GroupResponse[]>('/api/users/groups');
  return data;
}

export async function getGroup(id: string): Promise<GroupDetailResponse> {
  const { data } = await apiClient.get<GroupDetailResponse>(`/api/users/groups/${id}`);
  return data;
}

export async function createGroup(request: CreateGroupRequest): Promise<GroupResponse> {
  const { data } = await apiClient.post<GroupResponse>('/api/users/groups', request);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  await apiClient.delete(`/api/users/groups/${id}`);
}

export async function addGroupMember(groupId: string, request: AddGroupMemberRequest): Promise<void> {
  await apiClient.post(`/api/users/groups/${groupId}/members`, request);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`/api/users/groups/${groupId}/members/${userId}`);
}
