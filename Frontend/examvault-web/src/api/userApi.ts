import apiClient from './axiosClient';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
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
