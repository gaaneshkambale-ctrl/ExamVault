import { describe, expect, it } from 'vitest';
import { buildPerformanceSummaries } from './performanceSummary';
import type { AdminAttemptResultResponse } from '../types/result';
import type { ExamResponse } from '../types/exam';

function makeExam(overrides: Partial<ExamResponse> & Pick<ExamResponse, 'id' | 'title'>): ExamResponse {
  return {
    examCode: null,
    description: '',
    category: 'General',
    containsSections: false,
    creationMethod: 'Manual',
    durationMinutes: 60,
    totalMarks: 50,
    passingMarks: 20,
    instructions: '',
    examTypeId: null,
    tags: '',
    academicFields: null,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResult: true,
    showCorrectAnswers: true,
    allowReview: true,
    startAtUtc: null,
    endAtUtc: null,
    maxAttempts: 1,
    negativeMarkingEnabled: false,
    negativeMarks: 0,
    showSectionSummaryToStudents: true,
    allowCalculator: false,
    allowNotes: false,
    autoSubmitOnTimeEnd: true,
    confirmBeforeSubmit: true,
    status: 'Published',
    totalQuestions: 5,
    createdOn: new Date().toISOString(),
    examTypeName: null,
    tenantId: 'tenant-1',
    createdByUserId: 'admin-1',
    createdByName: 'Test Admin',
    certificateEnabled: false,
    minimumCertificateScorePercent: 80,
    ...overrides,
  };
}

function makeAttempt(
  overrides: Partial<AdminAttemptResultResponse> & Pick<AdminAttemptResultResponse, 'attemptId' | 'userId' | 'examId' | 'totalScore' | 'passed'>,
): AdminAttemptResultResponse {
  return {
    examTitle: 'Exam',
    totalMarks: 50,
    passingMarks: 20,
    submittedAtUtc: new Date('2026-02-01T10:00:00Z').toISOString(),
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

const EXAM = makeExam({ id: 'exam-1', title: 'C# Programming', examCode: 'EX-1', examTypeName: 'Assessment Exam', startAtUtc: '2026-02-01T09:00:00Z' });
const STUDENTS = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'u4' }];

describe('buildPerformanceSummaries', () => {
  it('reuses the same authoritative Total Candidates/Submitted/Not Submitted/Passed/Failed as Exam Result/Result Analytics/Exam Reports', () => {
    const current = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 15, passed: false }),
    ];
    const rows = buildPerformanceSummaries(current, current, [], [EXAM], STUDENTS);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalCandidates).toBe(4); // full eligible roster, not just who is in the results
    expect(rows[0].submitted).toBe(2);
    expect(rows[0].notSubmitted).toBe(2); // u3, u4
    expect(rows[0].passed).toBe(1);
    expect(rows[0].failed).toBe(1);
  });

  it('passes through Exam Code/Exam Type/Exam Date from the exam record', () => {
    const current = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const rows = buildPerformanceSummaries(current, current, [], [EXAM], STUDENTS);
    expect(rows[0].examCode).toBe('EX-1');
    expect(rows[0].examType).toBe('Assessment Exam');
    expect(rows[0].examDate).toBe('2026-02-01T09:00:00Z');
  });

  it('computes Improvement % as a real current-vs-prior-period average comparison for the same exam, not a fabricated value', () => {
    const current = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 46, passed: true }), // 92%
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 40, passed: true }), // 80%
    ];
    const prior = [
      makeAttempt({ attemptId: 'p1', userId: 'u1', examId: 'exam-1', totalScore: 30, passed: true }), // 60%
      makeAttempt({ attemptId: 'p2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true }), // 60%
    ];
    const rows = buildPerformanceSummaries(current, current, prior, [EXAM], STUDENTS);
    // current avg 86%, prior avg 60% -> +43.3% improvement
    expect(rows[0].improvement.percent).toBeCloseTo(43.3, 1);
    expect(rows[0].improvement.direction).toBe('up');
  });

  it('reports no baseline (percent: null) rather than a fabricated 0% when the exam has zero results in the prior period', () => {
    const current = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const rows = buildPerformanceSummaries(current, current, [], [EXAM], STUDENTS);
    expect(rows[0].improvement.percent).toBeNull();
  });

  it('reports a real 0%/flat improvement when both periods genuinely have the same average - distinct from the no-baseline case', () => {
    const current = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 40, passed: true })]; // 80%
    const prior = [makeAttempt({ attemptId: 'p1', userId: 'u1', examId: 'exam-1', totalScore: 40, passed: true })]; // 80%
    const rows = buildPerformanceSummaries(current, current, prior, [EXAM], STUDENTS);
    expect(rows[0].improvement.percent).toBe(0);
    expect(rows[0].improvement.direction).toBe('flat');
  });

  it('computes Improvement % independently per exam - a prior-period result for one exam does not affect another exam\'s baseline', () => {
    const examB = makeExam({ id: 'exam-2', title: 'SQL Basics' });
    const current = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u1', examId: 'exam-2', totalScore: 45, passed: true }),
    ];
    const prior = [makeAttempt({ attemptId: 'p1', userId: 'u1', examId: 'exam-1', totalScore: 25, passed: false })]; // only exam-1 has prior data
    const rows = buildPerformanceSummaries(current, current, prior, [EXAM, examB], STUDENTS);
    const examOneRow = rows.find((r) => r.examId === 'exam-1')!;
    const examTwoRow = rows.find((r) => r.examId === 'exam-2')!;
    expect(examOneRow.improvement.percent).not.toBeNull();
    expect(examTwoRow.improvement.percent).toBeNull(); // exam-2 has no prior-period baseline at all
  });

  it('computes attendance from ALL results (not just the current-period ones) the same way buildExamSummaries does', () => {
    const allAttempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true, submittedAtUtc: '2025-01-01T00:00:00Z' }),
    ];
    const currentOnly = [allAttempts[0]];
    const rows = buildPerformanceSummaries(currentOnly, allAttempts, [], [EXAM], STUDENTS);
    expect(rows[0].submitted).toBe(2); // u2's out-of-window submission still counts as submitted
    expect(rows[0].notSubmitted).toBe(2);
  });
});
