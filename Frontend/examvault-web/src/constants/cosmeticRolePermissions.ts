// Static, non-persisted preview data for a role/permission system that
// doesn't exist in the backend yet - ExamVault's real UserRole is just
// Admin | Student (see types/user.ts), enforced by [Authorize(Roles=...)]
// on every endpoint. Nothing here is read from or written to the API;
// it exists purely so the admin Users pages can show what a fuller RBAC
// UI would look like, per an explicit request to build the wireframe's
// role/permission visuals as a static preview rather than omit them.
// Kept as one shared source so every page quoting a permission count
// (Add User, Roles & Permissions) agrees with the others.

export const COSMETIC_ROLES = ['Super Admin', 'Instructor', 'Viewer'] as const;
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
  Instructor: ['Dashboard - View', 'Exams - Create', 'Exams - Edit', 'Questions - Create', 'Questions - Edit', 'Results - View'],
  Viewer: ['Dashboard - View', 'Results - View', 'Reports - View'],
};

// Everything except Certificates - that's a student-only feature
// (pages/student/MyCertificates.tsx) with no admin-facing equivalent
// anywhere in AdminSidebar's real nav.
export const ADMIN_PERMISSIONS: CosmeticPermission[] = COSMETIC_PERMISSIONS.filter((p) => p !== 'Certificates - View');
export const STUDENT_PERMISSIONS: CosmeticPermission[] = ['Dashboard - View', 'Results - View', 'Certificates - View'];
