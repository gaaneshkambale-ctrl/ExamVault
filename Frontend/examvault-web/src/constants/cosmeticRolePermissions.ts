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
// policy wired to them. The constants below now serve two purposes: (1) the
// initial/loading-state fallback shown before the live data resolves,
// mirrored server-side in RolePermissionCatalog.cs as the one-time seed for
// a new tenant, and (2) COSMETIC_ROLES still drives the disabled
// "(not available)" dropdown options on Create User for roles that remain
// unimplemented (custom-role creation/assignment).
// Kept as one shared source so every page quoting a permission count
// (Add User, Roles & Permissions) agrees with the others.

export const COSMETIC_ROLES = ['Super Admin', 'Viewer'] as const;
export type CosmeticRole = (typeof COSMETIC_ROLES)[number];

export const COSMETIC_PERMISSIONS = [
  'Dashboard - View',
  'Exams - Create',
  'Exams - Edit',
  'Questions - Create',
  'Questions - Edit',
  'Results - View',
  'Users - View',
  'Users - Edit',
  'Settings - View',
  'Settings - Edit',
  'Reports - View',
  'Certificates - View',
] as const;
export type CosmeticPermission = (typeof COSMETIC_PERMISSIONS)[number];

// Static per-role permission set, used only to render the Roles &
// Permissions table and its summary counts - not enforced anywhere.
export const COSMETIC_ROLE_PERMISSIONS: Record<CosmeticRole | 'Super Admin', CosmeticPermission[]> = {
  'Super Admin': [...COSMETIC_PERMISSIONS],
  Viewer: ['Dashboard - View', 'Results - View', 'Reports - View'],
};

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
  'Questions - Create',
  'Questions - Edit',
  'Results - View',
];
