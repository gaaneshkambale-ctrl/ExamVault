import apiClient, { getRefreshToken } from './axiosClient';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  UpdateMyProfileRequest,
  UpdateUserRequest,
  UserListItem,
  UserPreferences,
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

export async function updateMyProfile(request: UpdateMyProfileRequest): Promise<UserProfile> {
  const { data } = await apiClient.put<UserProfile>('/api/users/me', request);
  return data;
}

export async function updateMyPhoto(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('photo', file);
  await apiClient.put('/api/users/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// The photo endpoint requires the Bearer token, so a plain <img src> can't
// hit it directly - fetch the bytes through the authenticated client and
// hand back an object URL the caller can point an <img> at (and must revoke
// with URL.revokeObjectURL when done).
export async function fetchMyPhotoObjectUrl(): Promise<string | null> {
  try {
    const { data } = await apiClient.get<Blob>('/api/users/me/photo', { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}

// Admin-only counterpart to fetchMyPhotoObjectUrl - lets an admin screen
// render another user's photo (e.g. Live Monitoring's student avatars).
export async function fetchUserPhotoObjectUrl(userId: string): Promise<string | null> {
  try {
    const { data } = await apiClient.get<Blob>(`/api/users/${userId}/photo`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}

export async function getMySessions(): Promise<UserSession[]> {
  const { data } = await apiClient.get<UserSession[]>('/api/users/me/sessions', {
    headers: { 'X-Refresh-Token': getRefreshToken() ?? '' },
  });
  return data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.post(`/api/users/me/sessions/${sessionId}/revoke`);
}

export async function revokeOtherSessions(): Promise<void> {
  await apiClient.post(
    '/api/users/me/sessions/revoke-others',
    {},
    { headers: { 'X-Refresh-Token': getRefreshToken() ?? '' } },
  );
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

export async function getMyPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get<UserPreferences>('/api/users/me/preferences');
  return data;
}

export async function updateMyPreferences(request: UserPreferences): Promise<UserPreferences> {
  const { data } = await apiClient.put<UserPreferences>('/api/users/me/preferences', request);
  return data;
}

// Student-only, real - immediately blocks the caller's own next login the
// same way admin-deactivating a user already does. Never call this for an
// Admin caller; the backend rejects it with 409 anyway, but the frontend
// hides the control entirely for Admins rather than showing a button that
// can never succeed.
export async function deactivateMyAccount(): Promise<void> {
  await apiClient.post('/api/users/me/deactivate');
}
