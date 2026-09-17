import { describe, expect, it } from 'vitest';
import { getPopulatedStudentAcademicFields, getStudentFieldsForType, hasExamAcademicScope } from './organizationTypeFieldCatalog';

describe('getStudentFieldsForType', () => {
  it('has no separate Course key for College/University - Program is the single field for that real-world value there', () => {
    expect(getStudentFieldsForType('College').find((f) => f.key === 'course')).toBeUndefined();
    expect(getStudentFieldsForType('University').find((f) => f.key === 'course')).toBeUndefined();
  });

  it('keeps Course for an Organization Type with no Program field at all (eg. a Coaching Institute)', () => {
    expect(getStudentFieldsForType('Coaching Institute').find((f) => f.key === 'course')).toBeDefined();
  });
});

describe('hasExamAcademicScope', () => {
  it('is true for College/University - their exam fields include Program/Department/Semester/Division', () => {
    expect(hasExamAcademicScope('College')).toBe(true);
    expect(hasExamAcademicScope('University')).toBe(true);
  });

  it('is false for an org type whose exam fields are not eligibility-relevant (eg. a School\'s Term/Subject)', () => {
    expect(hasExamAcademicScope('School')).toBe(false);
    expect(hasExamAcademicScope('Coaching Institute')).toBe(false);
  });

  it('is false for an unrecognized or missing org type', () => {
    expect(hasExamAcademicScope(null)).toBe(false);
    expect(hasExamAcademicScope('Some Custom Type')).toBe(false);
  });
});

describe('getPopulatedStudentAcademicFields', () => {
  it('returns Department/Year of Study/Semester/Division/Academic Year for a College/University student, in that fixed order, excluding Program/PRN/Enrollment No. (shown separately by the caller) - a stray stored "course" value (from before the field was removed) is ignored, since it is no longer part of this catalog at all', () => {
    const fields = getPopulatedStudentAcademicFields('University', {
      program: 'B.Tech Computer Engineering',
      department: 'Computer Engineering',
      semester: '6',
      division: 'A',
      enrollmentNo: 'ENR2026001',
      prn: 'PRN2026001',
      course: 'B.Tech Computer Engineering',
      year: '3',
      academicYear: '2026-27',
    });
    expect(fields).toEqual([
      { label: 'Department', value: 'Computer Engineering' },
      { label: 'Year of Study', value: '3' },
      { label: 'Semester', value: '6' },
      { label: 'Division / Class', value: 'A' },
      { label: 'Academic Year', value: '2026-27' },
    ]);
  });

  it('omits any key the student has not set - never fabricates a value', () => {
    const fields = getPopulatedStudentAcademicFields('University', { department: 'Computer Engineering' });
    expect(fields).toEqual([{ label: 'Department', value: 'Computer Engineering' }]);
  });

  it('returns an empty array when academicFields is null/undefined', () => {
    expect(getPopulatedStudentAcademicFields('University', null)).toEqual([]);
    expect(getPopulatedStudentAcademicFields('University', undefined)).toEqual([]);
  });

  it('returns an empty array for an org type with no student field catalog at all', () => {
    expect(getPopulatedStudentAcademicFields(null, { department: 'Computer Engineering' })).toEqual([]);
    expect(getPopulatedStudentAcademicFields('Some Custom Type', { department: 'Computer Engineering' })).toEqual([]);
  });

  it('uses the School catalog (Class/Division/Academic Year/Admission No.) for a School org type - different keys than College, Semester never leaks in', () => {
    const fields = getPopulatedStudentAcademicFields('School', {
      admissionNo: 'ADM-001',
      class: '10',
      division: 'B',
      academicYear: '2026-27',
    });
    expect(fields).toContainEqual({ label: 'Division', value: 'B' });
    expect(fields).toContainEqual({ label: 'Academic Year', value: '2026-27' });
    // School's own extra fields (not in the fixed priority order) still
    // appear, just appended after the prioritized ones.
    expect(fields).toContainEqual({ label: 'Admission No.', value: 'ADM-001' });
    expect(fields).toContainEqual({ label: 'Class', value: '10' });
    expect(fields.find((f) => f.label === 'Semester')).toBeUndefined();
  });

  it('includes Course for an Organization Type whose own catalog still has it (eg. a Coaching Institute) - just like any other of its fields', () => {
    const fields = getPopulatedStudentAcademicFields('Coaching Institute', {
      batch: 'Batch 2026-A',
      course: 'CAT Preparation',
      academicYear: '2026-27',
    });
    expect(fields).toContainEqual({ label: 'Course', value: 'CAT Preparation' });
    expect(fields).toContainEqual({ label: 'Batch', value: 'Batch 2026-A' });
    expect(fields).toContainEqual({ label: 'Academic Year', value: '2026-27' });
  });
});
