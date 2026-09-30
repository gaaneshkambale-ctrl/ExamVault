import { describe, expect, it } from 'vitest';
import { getActiveHierarchyLevels, resolveAcademicListValue, firstAcademicHierarchyChain } from './academicHierarchyIndex';
import type { AcademicHierarchyIndex } from './academicHierarchyIndex';
import type { FieldDef } from '../constants/organizationTypeFieldCatalog';
import type { AcademicListItem } from '../types/academicListItem';

describe('getActiveHierarchyLevels', () => {
  it('returns Program/Department/Semester/Division in order for a College-style catalog', () => {
    const fields: FieldDef[] = [
      { key: 'enrollmentNo', label: 'Enrollment No.' },
      { key: 'program', label: 'Program' },
      { key: 'department', label: 'Department' },
      { key: 'semester', label: 'Semester' },
      { key: 'division', label: 'Division / Class' },
      { key: 'academicYear', label: 'Academic Year' },
    ];
    expect(getActiveHierarchyLevels(fields)).toEqual(['Program', 'Department', 'Semester', 'Division']);
  });

  it('returns only the levels present in the catalog, in fixed relative order', () => {
    const fields: FieldDef[] = [{ key: 'division', label: 'Division' }];
    expect(getActiveHierarchyLevels(fields)).toEqual(['Division']);
  });

  it('returns an empty array for a catalog with no hierarchy fields', () => {
    const fields: FieldDef[] = [{ key: 'batch', label: 'Batch' }];
    expect(getActiveHierarchyLevels(fields)).toEqual([]);
  });
});

describe('resolveAcademicListValue', () => {
  const program: AcademicListItem = {
    id: 'prog-1',
    listType: 'Program',
    value: 'B.Tech Computer Engineering',
    parentId: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
  };
  const index: AcademicHierarchyIndex = { Program: [program] };

  it('finds a match by value under the right parent', () => {
    expect(resolveAcademicListValue(index, 'Program', null, 'B.Tech Computer Engineering')).toEqual(program);
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveAcademicListValue(index, 'Program', null, '  b.tech computer engineering ')).toEqual(program);
  });

  it('returns undefined when the parent does not match', () => {
    expect(resolveAcademicListValue(index, 'Program', 'some-other-parent', 'B.Tech Computer Engineering')).toBeUndefined();
  });

  it('returns undefined for a listType with nothing indexed', () => {
    expect(resolveAcademicListValue(index, 'Department', 'prog-1', 'Computer Science')).toBeUndefined();
  });
});

describe('firstAcademicHierarchyChain', () => {
  const program: AcademicListItem = {
    id: 'prog-1',
    listType: 'Program',
    value: 'B.Tech Computer Engineering',
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

  it('returns the first full chain when every level has at least one item', () => {
    const index: AcademicHierarchyIndex = { Program: [program], Department: [department] };
    expect(firstAcademicHierarchyChain(index, ['Program', 'Department'])).toEqual({
      Program: 'B.Tech Computer Engineering',
      Department: 'Computer Science',
    });
  });

  it('stops at the first level with nothing configured', () => {
    const index: AcademicHierarchyIndex = { Program: [program], Department: [] };
    expect(firstAcademicHierarchyChain(index, ['Program', 'Department'])).toEqual({
      Program: 'B.Tech Computer Engineering',
    });
  });

  it('returns an empty object when nothing is configured', () => {
    expect(firstAcademicHierarchyChain({}, ['Program', 'Department'])).toEqual({});
  });
});
