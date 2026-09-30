import { describe, expect, it } from 'vitest';
import { validateImportRow } from './importUsersValidation';
import type { ImportUserRow } from './importUsersValidation';
import type { AcademicHierarchyIndex } from './academicHierarchyIndex';
import type { FieldDef } from '../constants/organizationTypeFieldCatalog';
import type { AcademicListItem } from '../types/academicListItem';

const NO_ACADEMIC_FIELDS: FieldDef[] = [];
const EMPTY_INDEX: AcademicHierarchyIndex = {};

const validStudentRow: ImportUserRow = {
  fullName: 'Jane Doe',
  email: 'jane.doe@example.com',
  role: 'Student',
  phoneNumber: '9876543210',
  rollNumber: 'R-1001',
  academicFields: {},
};

const validAdminRow: ImportUserRow = {
  fullName: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  role: 'Admin',
  phoneNumber: '9876543211',
  rollNumber: '',
  academicFields: {},
};

describe('validateImportRow - base fields', () => {
  it('accepts a fully valid Student row with no academic fields configured for this org type', () => {
    expect(validateImportRow(validStudentRow, [validStudentRow], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Valid');
  });

  it('accepts a fully valid Admin row with no Roll Number', () => {
    expect(validateImportRow(validAdminRow, [validAdminRow], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Valid');
  });

  it('requires Full Name', () => {
    const row = { ...validStudentRow, fullName: '  ' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Full Name is required.');
  });

  it('requires Email', () => {
    const row = { ...validStudentRow, email: '' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Email is required.');
  });

  it('rejects a role that is not Student or Admin', () => {
    const row = { ...validStudentRow, role: 'Instructor' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Role must be exactly "Student" or "Admin".');
  });

  it('requires Phone Number for a Student row', () => {
    const row = { ...validStudentRow, phoneNumber: '' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Phone Number is required.');
  });

  it('requires Phone Number for an Admin row', () => {
    const row = { ...validAdminRow, phoneNumber: '' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Phone Number is required.');
  });

  it('requires Roll Number for a Student row', () => {
    const row = { ...validStudentRow, rollNumber: '' };
    expect(validateImportRow(row, [row], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Roll Number is required for Student rows.');
  });

  it('does not require Roll Number for an Admin row', () => {
    expect(validateImportRow(validAdminRow, [validAdminRow], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Valid');
  });

  it('rejects a duplicate email within the file', () => {
    const rowA = { ...validStudentRow };
    const rowB = { ...validAdminRow, email: validStudentRow.email };
    expect(validateImportRow(rowA, [rowA, rowB], NO_ACADEMIC_FIELDS, EMPTY_INDEX)).toBe('Duplicate email within the file.');
  });
});

describe('validateImportRow - academic fields (plain text)', () => {
  const fields: FieldDef[] = [
    { key: 'batch', label: 'Batch' },
    { key: 'course', label: 'Course', optional: true },
  ];

  it('requires a non-optional academic field for a Student row', () => {
    const row = { ...validStudentRow, academicFields: { course: 'DSA' } };
    expect(validateImportRow(row, [row], fields, EMPTY_INDEX)).toBe('Batch is required.');
  });

  it('does not require a field marked optional', () => {
    const row = { ...validStudentRow, academicFields: { batch: '2026-B' } };
    expect(validateImportRow(row, [row], fields, EMPTY_INDEX)).toBe('Valid');
  });

  it('never requires academic fields for an Admin row', () => {
    const row = { ...validAdminRow, academicFields: {} };
    expect(validateImportRow(row, [row], fields, EMPTY_INDEX)).toBe('Valid');
  });
});

describe('validateImportRow - Program/Department/Semester/Division hierarchy', () => {
  const fields: FieldDef[] = [
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
  ];

  const program: AcademicListItem = {
    id: 'prog-1',
    listType: 'Program',
    value: 'B.Tech Computer Engineering',
    parentId: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
  };
  const otherProgram: AcademicListItem = {
    id: 'prog-2',
    listType: 'Program',
    value: 'B.Tech Mechanical',
    parentId: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
  };
  const department: AcademicListItem = {
    id: 'dept-1',
    listType: 'Department',
    value: 'Computer Science',
    parentId: 'prog-1',
    createdAtUtc: '2026-01-01T00:00:00Z',
  };
  const departmentUnderOtherProgram: AcademicListItem = {
    id: 'dept-2',
    listType: 'Department',
    value: 'Mechanical Engineering',
    parentId: 'prog-2',
    createdAtUtc: '2026-01-01T00:00:00Z',
  };
  const index: AcademicHierarchyIndex = {
    Program: [program, otherProgram],
    Department: [department, departmentUnderOtherProgram],
  };

  it('accepts a Program/Department pair that matches the real configured chain', () => {
    const row = {
      ...validStudentRow,
      academicFields: { program: 'B.Tech Computer Engineering', department: 'Computer Science' },
    };
    expect(validateImportRow(row, [row], fields, index)).toBe('Valid');
  });

  it('is case/whitespace insensitive', () => {
    const row = {
      ...validStudentRow,
      academicFields: { program: '  b.tech computer engineering  ', department: 'computer science' },
    };
    expect(validateImportRow(row, [row], fields, index)).toBe('Valid');
  });

  it('rejects a Program value that does not match any configured Program', () => {
    const row = { ...validStudentRow, academicFields: { program: 'B.Tech Nonsense', department: 'Computer Science' } };
    expect(validateImportRow(row, [row], fields, index)).toBe(
      '"B.Tech Nonsense" is not a configured Program value (Organization Settings > Academic Configuration).',
    );
  });

  it('rejects a Department that exists but under a different Program', () => {
    const row = {
      ...validStudentRow,
      academicFields: { program: 'B.Tech Computer Engineering', department: 'Mechanical Engineering' },
    };
    expect(validateImportRow(row, [row], fields, index)).toBe(
      '"Mechanical Engineering" is not a configured Department value (Organization Settings > Academic Configuration).',
    );
  });

  it('rejects every hierarchy field when the tenant has not configured any lists yet', () => {
    const row = {
      ...validStudentRow,
      academicFields: { program: 'Anything', department: 'Anything' },
    };
    expect(validateImportRow(row, [row], fields, {})).toBe(
      '"Anything" is not a configured Program value (Organization Settings > Academic Configuration).',
    );
  });
});
