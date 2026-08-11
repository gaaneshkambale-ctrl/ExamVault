import apiClient from './axiosClient';
import type { RegisterRequest, RegisterResponse, UserProfile } from '../types/user';

export async function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/users/register', request);
  return data;
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(`/api/users/${id}`);
  return data;
}
