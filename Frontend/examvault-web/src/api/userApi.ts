import apiClient from './axiosClient';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  UpdateUserRequest,
  UserListItem,
  UserProfile,
  UserSession,
} from '../types/user';

export async function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/users/register', request);
  return data;
}

export async function loginUser(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/users/login', request);
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<RefreshTokenResponse>('/api/users/refresh-token', {
    refreshToken,
  });
  return data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await apiClient.post('/api/users/logout', { refreshToken });
}

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/api/users/me');
  return data;
}

export async function listUsers(): Promise<UserListItem[]> {
  const { data } = await apiClient.get<UserListItem[]>('/api/users');
  return data;
}

export async function getUser(id: string): Promise<UserListItem> {
  const { data } = await apiClient.get<UserListItem>(`/api/users/${id}`);
  return data;
}

export async function createUser(request: CreateUserRequest): Promise<UserListItem> {
  const { data } = await apiClient.post<UserListItem>('/api/users', request);
  return data;
}

export async function updateUser(id: string, request: UpdateUserRequest): Promise<UserListItem> {
  const { data } = await apiClient.put<UserListItem>(`/api/users/${id}`, request);
  return data;
}

export async function resetUserPassword(id: string, request: ResetPasswordRequest): Promise<void> {
  await apiClient.put(`/api/users/${id}/reset-password`, request);
}

export async function changeMyPassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.put('/api/users/me/password', request);
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/users/${id}`);
}

export async function deactivateUser(id: string): Promise<UserListItem> {
  const { data } = await apiClient.post<UserListItem>(`/api/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: string): Promise<UserListItem> {
  const { data } = await apiClient.post<UserListItem>(`/api/users/${id}/activate`);
  return data;
}

export async function getUserSessions(id: string): Promise<UserSession[]> {
  const { data } = await apiClient.get<UserSession[]>(`/api/users/${id}/sessions`);
  return data;
}
