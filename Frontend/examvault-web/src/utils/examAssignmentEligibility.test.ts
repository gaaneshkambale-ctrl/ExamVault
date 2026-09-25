import { describe, expect, it } from 'vitest';
import { describeScope, getExamScope, isStudentEligible } from './examAssignmentEligibility';
import type { StudentSummary } from '../types/user';

function makeStudent(academicFields: Record<string, string> | null): StudentSummary {
  return { id: 's1', fullName: 'Test Student', email: 't@example.com', rollNumber: null, hasPhoto: false, academicFields };
}

describe('getExamScope', () => {
  it('returns an empty scope when the exam is not restricted, even if academicFields has values', () => {
    expect(getExamScope({ program: 'B.Tech', department: 'CE', semester: '6' }, false)).toEqual({});
  });

  it('returns only the well-known scope keys, trimmed, ignoring non-scope keys like examDate', () => {
    expect(getExamScope({ program: ' B.Tech ', department: 'Computer Engineering', semester: '6', examDate: '12 Apr 2026' }, true)).toEqual({
      program: 'B.Tech',
      department: 'Computer Engineering',
      semester: '6',
    });
  });

  it('omits a scope key entirely when unset (eg. Division left as "All Divisions")', () => {
    const scope = getExamScope({ program: 'B.Tech', department: 'Computer Engineering', semester: '6' }, true);
    expect(scope.division).toBeUndefined();
  });

  it('returns an empty scope for a restricted exam with no academicFields at all', () => {
    expect(getExamScope(null, true)).toEqual({});
  });
});

describe('isStudentEligible', () => {
  const scope = { program: 'B.Tech', department: 'Computer Engineering', semester: '6' };

  it('matches a student whose fields equal the scope, case-insensitively', () => {
    expect(isStudentEligible(scope, makeStudent({ program: 'b.tech', department: 'Computer Engineering', semester: '6' }))).toBe(true);
  });

  it('rejects a student missing one of the scoped fields', () => {
    expect(isStudentEligible(scope, makeStudent({ program: 'B.Tech', department: 'Computer Engineering' }))).toBe(false);
  });

  it('rejects a student with no academicFields at all when the exam has a scope', () => {
    expect(isStudentEligible(scope, makeStudent(null))).toBe(false);
  });

  it('accepts any student when the scope is empty (unscoped exam)', () => {
    expect(isStudentEligible({}, makeStudent(null))).toBe(true);
  });

  it('rejects a student whose Division does not match when the exam scopes Division too', () => {
    const withDivision = { ...scope, division: 'A' };
    expect(isStudentEligible(withDivision, makeStudent({ program: 'B.Tech', department: 'Computer Engineering', semester: '6', division: 'B' }))).toBe(
      false,
    );
  });
});

describe('describeScope', () => {
  it('joins scope values in Program / Department / Semester / Division order regardless of key insertion order', () => {
    expect(describeScope({ semester: '6', program: 'B.Tech', department: 'Computer Engineering' })).toBe('B.Tech / Computer Engineering / 6');
  });

  it('returns an empty string for an empty scope', () => {
    expect(describeScope({})).toBe('');
  });
});
