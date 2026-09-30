import { describe, expect, it } from 'vitest';
import { buildStudentSummaries } from './studentSummary';
import type { AdminAttemptResultResponse } from '../types/result';
import type { StudentSummary } from '../types/user';

function makeStudent(overrides: Partial<StudentSummary> & Pick<StudentSummary, 'id' | 'fullName' | 'email'>): StudentSummary {
  return {
    rollNumber: null,
    hasPhoto: false,
    academicFields: null,
    ...overrides,
  };
}

function makeAttempt(
  overrides: Partial<AdminAttemptResultResponse> & Pick<AdminAttemptResultResponse, 'attemptId' | 'userId' | 'totalScore' | 'passed'>,
): AdminAttemptResultResponse {
  return {
    examId: 'exam-1',
    examTitle: 'Exam',
    totalMarks: 50,
    passingMarks: 20,
    submittedAtUtc: new Date('2026-01-01T10:00:00Z').toISOString(),
    questions: [],
    hasPendingGrading: false,
    fullscreenExitCount: 0,
    noFaceDetectedCount: 0,
    multipleFacesDetectedCount: 0,
    tabSwitchCount: 0,
    multipleTabsCount: 0,
    copyPasteCount: 0,
    rightClickCount: 0,
    multipleMonitorsCount: 0,
    correctCount: 4,
    incorrectCount: 1,
    skippedCount: 0,
    accuracy: 80,
    rank: null,
    percentile: null,
    totalParticipants: null,
    ...overrides,
  };
}

describe('buildStudentSummaries', () => {
  it('passes through real academic data (Registration No./Program/Department/Semester/Division) when present', () => {
    const student = makeStudent({
      id: 'u1',
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      rollNumber: 'GU2026001',
      academicFields: { program: 'B.Tech Computer Engineering', department: 'Computer Science', semester: '5', division: 'A' },
    });
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 45, passed: true })];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows).toHaveLength(1);
    expect(rows[0].registrationNo).toBe('GU2026001');
    expect(rows[0].program).toBe('B.Tech Computer Engineering');
    expect(rows[0].department).toBe('Computer Science');
    expect(rows[0].semester).toBe('5');
    expect(rows[0].division).toBe('A');
  });

  it('leaves Registration No./Program/Department/Semester/Division blank (null) when the student has none set - never fabricates a value', () => {
    const student = makeStudent({ id: 'u1', fullName: 'John Doe', email: 'john@example.com' }); // rollNumber/academicFields both default to null
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 30, passed: true })];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].registrationNo).toBeNull();
    expect(rows[0].program).toBeNull();
    expect(rows[0].department).toBeNull();
    expect(rows[0].semester).toBeNull();
    expect(rows[0].division).toBeNull();
  });

  it('leaves only the specific missing keys blank when academicFields is partially set (eg. a School student with Division but no Program/Department/Semester)', () => {
    const student = makeStudent({
      id: 'u1',
      fullName: 'Arjun Mehta',
      email: 'arjun@example.com',
      academicFields: { division: 'B', class: '10' }, // School org type shape - no program/department/semester keys at all
    });
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 40, passed: true })];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].division).toBe('B');
    expect(rows[0].program).toBeNull();
    expect(rows[0].department).toBeNull();
    expect(rows[0].semester).toBeNull();
  });

  it('computes Exams Passed/Exams Failed from the existing per-attempt result calculation', () => {
    const student = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u1', examId: 'exam-2', totalScore: 15, passed: false }),
      makeAttempt({ attemptId: 'a3', userId: 'u1', examId: 'exam-3', totalScore: 40, passed: true }),
    ];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].examsSubmitted).toBe(3);
    expect(rows[0].examsPassed).toBe(2);
    expect(rows[0].examsFailed).toBe(1);
  });

  it('computes Average %/Highest %/Lowest %/Pass % correctly across a mixed pass/fail spread', () => {
    const student = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 46, passed: true }), // 92%
      makeAttempt({ attemptId: 'a2', userId: 'u1', totalScore: 41, passed: true }), // 82%
      makeAttempt({ attemptId: 'a3', userId: 'u1', totalScore: 18, passed: false }), // 36%
      makeAttempt({ attemptId: 'a4', userId: 'u1', totalScore: 15, passed: false }), // 30%
    ];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].averagePercent).toBe(60); // (92+82+36+30)/4
    expect(rows[0].highestPercent).toBe(92);
    expect(rows[0].lowestPercent).toBe(30);
    expect(rows[0].passPercent).toBe(50); // 2/4
  });

  it('omits a student with no results in the given (already-filtered) attempts - matches the on-screen table, which only lists active students', () => {
    const attempted = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const neverAttempted = makeStudent({ id: 'u2', fullName: 'John Doe', email: 'john@example.com' });
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 45, passed: true })];
    const rows = buildStudentSummaries(attempts, [attempted, neverAttempted]);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u1');
  });

  it('counts Exams Submitted/Attempted as a raw count including a retake on the same exam - same definition the page already used before this change', () => {
    const student = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 20, passed: false }),
      makeAttempt({ attemptId: 'a1-retake', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
    ];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].examsSubmitted).toBe(2);
    expect(rows[0].examsPassed).toBe(1);
    expect(rows[0].examsFailed).toBe(1);
  });

  it('picks the most recent submission as Last Attempt', () => {
    const student = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 45, passed: true, submittedAtUtc: '2026-01-05T00:00:00Z' }),
      makeAttempt({ attemptId: 'a2', userId: 'u1', totalScore: 40, passed: true, submittedAtUtc: '2026-01-10T00:00:00Z' }),
    ];
    const rows = buildStudentSummaries(attempts, [student]);
    expect(rows[0].lastAttemptUtc).toBe('2026-01-10T00:00:00Z');
  });

  it('produces one independent row per student when multiple students are present', () => {
    const s1 = makeStudent({ id: 'u1', fullName: 'Priya Sharma', email: 'priya@example.com' });
    const s2 = makeStudent({ id: 'u2', fullName: 'John Doe', email: 'john@example.com' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', totalScore: 10, passed: false }),
    ];
    const rows = buildStudentSummaries(attempts, [s1, s2]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.userId === 'u1')!.examsPassed).toBe(1);
    expect(rows.find((r) => r.userId === 'u2')!.examsFailed).toBe(1);
  });
});
