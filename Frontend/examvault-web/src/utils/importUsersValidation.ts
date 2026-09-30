import type { FieldDef } from '../constants/organizationTypeFieldCatalog';
import type { AcademicHierarchyIndex } from './academicHierarchyIndex';
import { HIER_TYPE_BY_KEY, resolveAcademicListValue } from './academicHierarchyIndex';

export interface ImportUserRow {
  fullName: string;
  email: string;
  role: string;
  phoneNumber: string;
  rollNumber: string;
  academicFields: Record<string, string>;
}

// Same requirement CreateUser.tsx's own validateAcademicFields() applies to
// the Student "Academic Details" section: every field in this org type's
// catalog is required unless marked `optional`. Program/Department/
// Semester/Division additionally have to match a real value configured in
// Organization Settings > Academic Configuration, walking the same
// parent-chain the interactive cascading picker enforces (a Department that
// exists but under a different Program doesn't count) - `hierarchyIndex` is
// the tenant's fetched list tree (see academicHierarchyIndex.ts).
function validateAcademicFields(
  academicFields: Record<string, string>,
  studentFields: FieldDef[],
  hierarchyIndex: AcademicHierarchyIndex,
): string | null {
  let parentId: string | null = null;
  for (const field of studentFields) {
    const value = academicFields[field.key]?.trim() ?? '';
    const hierType = HIER_TYPE_BY_KEY[field.key];

    if (!value) {
      if (field.optional) continue;
      return `${field.label} is required.`;
    }

    if (hierType) {
      const match = resolveAcademicListValue(hierarchyIndex, hierType, parentId, value);
      if (!match) {
        return `"${value}" is not a configured ${field.label} value (Organization Settings > Academic Configuration).`;
      }
      parentId = match.id;
    }
  }
  return null;
}

// Mirrors CreateUser.tsx's own Add User wizard rules - Phone Number is
// mandatory for every user, Roll Number and every Academic Details field
// (for the tenant's Organization Type) only for Student rows (Admin rows
// leave them blank) - the backend (CreateUserValidator.cs) enforces Phone
// Number/Roll Number the same way, but AcademicFields is a free-form,
// per-org-type dictionary the backend deliberately doesn't validate (see
// ActionPlan.txt), so this file is the only place a bad/incomplete Student
// academic record gets caught before Import.
export function validateImportRow(
  row: ImportUserRow,
  allRows: ImportUserRow[],
  studentFields: FieldDef[],
  hierarchyIndex: AcademicHierarchyIndex,
): string {
  if (!row.fullName.trim()) {
    return 'Full Name is required.';
  }
  if (!row.email.trim()) {
    return 'Email is required.';
  }
  if (row.role !== 'Student' && row.role !== 'Admin') {
    return 'Role must be exactly "Student" or "Admin".';
  }
  if (!row.phoneNumber.trim()) {
    return 'Phone Number is required.';
  }
  if (row.role === 'Student') {
    if (!row.rollNumber.trim()) {
      return 'Roll Number is required for Student rows.';
    }
    const academicError = validateAcademicFields(row.academicFields, studentFields, hierarchyIndex);
    if (academicError) {
      return academicError;
    }
  }
  const emailLower = row.email.trim().toLowerCase();
  const duplicateInFile = allRows.filter((r) => r.email.trim().toLowerCase() === emailLower);
  if (duplicateInFile.length > 1) {
    return 'Duplicate email within the file.';
  }
  return 'Valid';
}
