// Default/fallback data for the role/permission preview system - ExamVault's
// real UserRole (within a tenant's own Users management) is
// Admin | Student | Instructor (see types/user.ts), enforced by
// [Authorize(Roles=...)] on every endpoint. SuperAdmin is also real and
// enforced, but it's a platform-level role managed outside any tenant's own
// user list, so it isn't assignable from here - see pages/platform/* for
// its actual console.
//
// The Roles & Permissions page's checkbox grid IS now real and persisted
// (see hooks/useRolePermissions.ts, backed by RolesController on the
// backend) - an Admin can edit and save a role's permission set. Some of
// those permissions are now genuinely enforced server-side too (see
// PermissionPolicies.cs in UserService/ResultService/ExamService/
// QuestionService) - what remains true is that the checkbox grid itself is
// still informational for whichever permissions don't yet have a backend
// policy wired to them. ADMIN_PERMISSIONS/STUDENT_PERMISSIONS/
// INSTRUCTOR_PERMISSIONS below are the initial/loading-state fallback shown
// before the live data resolves, mirrored server-side in
// RolePermissionCatalog.cs as the one-time seed for a new tenant.
// COSMETIC_ROLES separately still drives the disabled "(not available)"
// dropdown options on Create User for roles that remain unimplemented
// (custom-role creation/assignment) - Roles & Permissions itself no longer
// shows a Viewer row (never a real, assignable role) or an Admin row
// (that page is Admin-only, so its own row could never be edited by
// whoever is viewing it).
// Kept as one shared source so every page quoting a permission count
// (Add User, Roles & Permissions) agrees with the others.

export const COSMETIC_ROLES = ['Super Admin', 'Viewer'] as const;

export const COSMETIC_PERMISSIONS = [
  'Dashboard - View',
  'Exams - Create',
  'Exams - Edit',
  'Assignments - Manage',
  'Questions - Create',
  'Questions - Edit',
  'Results - View',
  'Live Monitoring - View',
  'Security Violations - View',
  'Users - View',
  'Users - Edit',
  'Settings - View',
  'Settings - Edit',
  'Reports - View',
  'Notifications - Create',
  'Certificates - View',
] as const;
export type CosmeticPermission = (typeof COSMETIC_PERMISSIONS)[number];

// Everything except Certificates - that's a student-only feature
// (pages/student/MyCertificates.tsx) with no admin-facing equivalent
// anywhere in AdminSidebar's real nav.
export const ADMIN_PERMISSIONS: CosmeticPermission[] = COSMETIC_PERMISSIONS.filter((p) => p !== 'Certificates - View');
export const STUDENT_PERMISSIONS: CosmeticPermission[] = ['Dashboard - View', 'Results - View', 'Certificates - View'];
// Mirrors RolePermissionCatalog.DefaultsForRole("Instructor") server-side.
export const INSTRUCTOR_PERMISSIONS: CosmeticPermission[] = [
  'Dashboard - View',
  'Exams - Create',
  'Exams - Edit',
  'Assignments - Manage',
  'Questions - Create',
  'Questions - Edit',
  'Results - View',
  'Live Monitoring - View',
  'Security Violations - View',
  'Reports - View',
  'Notifications - Create',
];
