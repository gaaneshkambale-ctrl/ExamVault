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

export type Gender = 'Male' | 'Female' | 'Other' | 'PreferNotToSay';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Admin' | 'SuperAdmin' | 'Instructor';
  mustChangePassword: boolean;
  phoneNumber: string | null;
  hasPhoto: boolean;
  username: string | null;
  alternateEmail: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  location: string | null;
  department: string | null;
  designation: string | null;
  lastLoginAtUtc: string | null;
  joinedOnUtc: string | null;
  formattedUserId: string | null;
  isActive: boolean;
}

export interface UpdateMyProfileRequest {
  fullName: string;
  phoneNumber: string;
  username?: string | null;
  alternateEmail?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  location?: string | null;
  department?: string | null;
  designation?: string | null;
}

export type TimeFormat = 'Hour12' | 'Hour24';
export type AppTheme = 'Light' | 'Dark' | 'System';

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormat;
  theme: AppTheme;
}

export interface LoginRequest {
  email: string;
  password: string;
  // Set from the subdomain the request arrived on (see utils/tenant.ts) so
  // the same email can exist in two different tenants - omitted entirely
  // when there's no subdomain to resolve (local dev, today's Azure dev env).
  tenantSlug?: string;
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

export type UserRole = 'Admin' | 'Student' | 'Instructor';

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAtUtc: string;
  isActive: boolean;
  phoneNumber: string | null;
  hasPhoto: boolean;
  rollNumber: string | null;
  // Only meaningful for a Super Admin's cross-tenant "All Users" view -
  // always present at runtime, but a regular Admin's own "Manage Users"
  // page has no use for them.
  tenantId: string;
  lastLoginAtUtc: string | null;
}

// GET /api/users returns every role (including SuperAdmin) when called by
// a Super Admin - kept as its own type rather than widening UserListItem's
// `role` in place, since several existing tenant-scoped Admin pages
// (ManageUsers.tsx etc.) index Record<UserRole, ...> lookups and assign
// `role` to a UserRole-typed variable, which a wider union would break for
// data they never actually receive anyway.
export interface PlatformUserListItem extends Omit<UserListItem, 'role'> {
  role: UserRole | 'SuperAdmin';
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
  rollNumber?: string | null;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
  rollNumber?: string | null;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RolePermissionsEntry {
  role: string;
  permissions: string[];
}

export type UserSessionStatus = 'Active' | 'Expired' | 'Revoked';

export interface UserSession {
  id: string;
  issuedAtUtc: string;
  expiresAtUtc: string;
  revokedAtUtc: string | null;
  status: UserSessionStatus;
  deviceLabel: string;
  isCurrent: boolean;
  ipAddress: string | null;
}
