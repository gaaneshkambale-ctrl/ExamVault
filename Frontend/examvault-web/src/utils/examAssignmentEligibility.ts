import type { StudentSummary } from '../types/user';

// The only keys CreateAssignmentHandler's eligibility check compares
// (Backend/.../CreateAssignmentHandler.cs's own ScopeKeys) - this is the
// client-side mirror used only to build Assign Exam's "Eligible Students"
// picker UX; the backend re-checks this independently and is the real
// boundary (a client that never calls this function, or calls it wrong,
// still can't get an ineligible student assigned without an Admin
// override).
export const EXAM_SCOPE_KEYS = ['program', 'department', 'semester', 'division'] as const;

export function getExamScope(
  academicFields: Record<string, string> | null | undefined,
  restrictToAcademicScope: boolean,
): Record<string, string> {
  if (!restrictToAcademicScope || !academicFields) return {};
  const scope: Record<string, string> = {};
  for (const key of EXAM_SCOPE_KEYS) {
    const value = academicFields[key];
    if (value?.trim()) scope[key] = value.trim();
  }
  return scope;
}

export function isStudentEligible(scope: Record<string, string>, student: StudentSummary): boolean {
  return Object.entries(scope).every(
    ([key, value]) => (student.academicFields?.[key] ?? '').trim().toLowerCase() === value.toLowerCase(),
  );
}

export function describeScope(scope: Record<string, string>): string {
  return EXAM_SCOPE_KEYS.filter((key) => key in scope)
    .map((key) => scope[key])
    .join(' / ');
}
