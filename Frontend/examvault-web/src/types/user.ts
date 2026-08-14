export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  fullName: string;
  email: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Admin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export type UserRole = 'Admin' | 'Student';

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAtUtc: string;
  isActive: boolean;
  phoneNumber: string | null;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  phoneNumber: string;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
