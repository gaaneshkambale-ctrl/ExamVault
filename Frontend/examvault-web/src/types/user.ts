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
