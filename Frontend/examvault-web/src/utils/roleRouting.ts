import type { UserProfile } from '../types/user';

// Where a role lands after login / on "back to dashboard" links - single
// source of truth so Instructor doesn't silently fall through to the
// Student dashboard the way a binary role === 'Admin' ternary would leave it.
export function dashboardPathForRole(role: UserProfile['role']): string {
  switch (role) {
    case 'SuperAdmin':
      return '/platform/dashboard';
    case 'Admin':
      return '/admin/dashboard';
    case 'Instructor':
      return '/instructor/dashboard';
    default:
      return '/dashboard';
  }
}
