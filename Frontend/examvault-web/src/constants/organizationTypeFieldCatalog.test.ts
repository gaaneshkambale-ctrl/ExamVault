import { describe, expect, it } from 'vitest';
import { getPopulatedStudentAcademicFields } from './organizationTypeFieldCatalog';

describe('getPopulatedStudentAcademicFields', () => {
  it('returns every populated field for a College/University student, labeled per the catalog, excluding Program', () => {
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
    expect(fields.find((f) => f.label === 'Program')).toBeUndefined();
    expect(fields).toContainEqual({ label: 'Department', value: 'Computer Engineering' });
    expect(fields).toContainEqual({ label: 'Semester', value: '6' });
    expect(fields).toContainEqual({ label: 'Division / Class', value: 'A' });
    expect(fields).toContainEqual({ label: 'Enrollment No.', value: 'ENR2026001' });
    expect(fields).toContainEqual({ label: 'PRN / Registration No.', value: 'PRN2026001' });
    expect(fields).toContainEqual({ label: 'Course', value: 'B.Tech Computer Engineering' });
    expect(fields).toContainEqual({ label: 'Year', value: '3' });
    expect(fields).toContainEqual({ label: 'Academic Year', value: '2026-27' });
    expect(fields).toHaveLength(8);
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

  it('uses the School catalog (Class/Division/Academic Year/Admission No.) for a School org type - different keys than College', () => {
    const fields = getPopulatedStudentAcademicFields('School', {
      admissionNo: 'ADM-001',
      class: '10',
      division: 'B',
      academicYear: '2026-27',
    });
    expect(fields).toContainEqual({ label: 'Admission No.', value: 'ADM-001' });
    expect(fields).toContainEqual({ label: 'Class', value: '10' });
    expect(fields).toContainEqual({ label: 'Division', value: 'B' });
    expect(fields).toContainEqual({ label: 'Academic Year', value: '2026-27' });
    // College-only keys must not leak in for a School student.
    expect(fields.find((f) => f.label === 'Semester')).toBeUndefined();
  });
});
