import { describe, expect, it } from 'vitest';
import { buildExamSummaries } from './examSummary';
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

const EXAM = makeExam({ id: 'exam-1', title: 'C# Programming', examCode: 'EX-1', examTypeName: 'Assessment Exam', startAtUtc: '2026-01-01T09:00:00Z' });

const STUDENTS = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'u4' }];

describe('buildExamSummaries', () => {
  it('computes Total Candidates/Submitted/Not Submitted from the eligible roster, not just who is in the results list', () => {
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 15, passed: false }),
    ];
    const rows = buildExamSummaries(attempts, attempts, [EXAM], STUDENTS);
    expect(rows).toHaveLength(1);
    // 4 eligible students (u1-u4), only u1/u2 submitted - u3/u4 never did.
    expect(rows[0].totalCandidates).toBe(4);
    expect(rows[0].submitted).toBe(2);
    expect(rows[0].notSubmitted).toBe(2);
  });

  it('counts Submitted as unique candidates, not raw attempt rows - a retake does not inflate it', () => {
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 20, passed: false }),
      makeAttempt({ attemptId: 'a1-retake', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true }),
    ];
    const rows = buildExamSummaries(attempts, attempts, [EXAM], STUDENTS);
    // u1 submitted twice, u2 once - 2 unique candidates, not 3 attempt rows.
    expect(rows[0].submitted).toBe(2);
    expect(rows[0].notSubmitted).toBe(2); // u3, u4
  });

  it('computes Passed/Failed from the actual per-attempt results, and Submitted Attempts as the raw submitted-record count (including the retake)', () => {
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 15, passed: false }),
      makeAttempt({ attemptId: 'a3', userId: 'u3', examId: 'exam-1', totalScore: 40, passed: true }),
    ];
    const rows = buildExamSummaries(attempts, attempts, [EXAM], STUDENTS);
    expect(rows[0].passed).toBe(2);
    expect(rows[0].failed).toBe(1);
    expect(rows[0].submittedAttempts).toBe(3);
  });

  it('computes Pass %/Average %/Highest %/Lowest % correctly, including a mixed pass/fail spread', () => {
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 46, passed: true }), // 92%
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 41, passed: true }), // 82%
      makeAttempt({ attemptId: 'a3', userId: 'u3', examId: 'exam-1', totalScore: 18, passed: false }), // 36%
      makeAttempt({ attemptId: 'a4', userId: 'u4', examId: 'exam-1', totalScore: 15, passed: false }), // 30%
    ];
    const rows = buildExamSummaries(attempts, attempts, [EXAM], STUDENTS);
    expect(rows[0].passPercent).toBe(50); // 2/4
    expect(rows[0].averagePercent).toBe(60); // (92+82+36+30)/4 = 60
    expect(rows[0].highestPercent).toBe(92);
    expect(rows[0].lowestPercent).toBe(30);
  });

  it('passes through Exam Code/Exam Type/Exam Date from the exam record', () => {
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const rows = buildExamSummaries(attempts, attempts, [EXAM], STUDENTS);
    expect(rows[0].examTitle).toBe('C# Programming');
    expect(rows[0].examCode).toBe('EX-1');
    expect(rows[0].examType).toBe('Assessment Exam');
    expect(rows[0].examDate).toBe('2026-01-01T09:00:00Z');
  });

  it('falls back to the earliest real submission for Exam Date when the exam itself was never directly scheduled (exam.startAtUtc null - this app schedules per-assignment)', () => {
    const unscheduledExam = makeExam({ id: 'exam-1', title: 'C# Programming', startAtUtc: null });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true, submittedAtUtc: '2026-02-05T10:00:00Z' }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true, submittedAtUtc: '2026-02-01T09:00:00Z' }),
    ];
    const rows = buildExamSummaries(attempts, attempts, [unscheduledExam], STUDENTS);
    expect(rows[0].examDate).toBe('2026-02-01T09:00:00Z');
  });

  it('computes attendance from ALL results, not just the date/exam/category-filtered ones - a submission outside the filter window still counts as submitted, not not-submitted', () => {
    // u2's attempt is in `allResults` (the exam's real, full history) but
    // excluded from `filteredResults` (as if the dashboard's date range
    // filter had scoped it out) - attendance must still see it.
    const allAttempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true, submittedAtUtc: '2025-01-01T00:00:00Z' }),
    ];
    const filteredAttempts = [allAttempts[0]]; // only u1 is inside the "current filter window"
    const rows = buildExamSummaries(filteredAttempts, allAttempts, [EXAM], STUDENTS);
    // u2 submitted (just outside the filter) - must not be miscounted as not submitted.
    expect(rows[0].submitted).toBe(2);
    expect(rows[0].notSubmitted).toBe(2); // u3, u4 - never submitted
    // But Submitted Attempts/Passed (filtered performance metrics) only reflect u1.
    expect(rows[0].submittedAttempts).toBe(1);
    expect(rows[0].passed).toBe(1);
  });

  it('only includes exams that have at least one result in the filtered set - an exam with zero filtered results produces no row', () => {
    const allAttempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const rows = buildExamSummaries([], allAttempts, [EXAM], STUDENTS);
    expect(rows).toHaveLength(0);
  });

  it('produces one independent row per exam when multiple exams are present', () => {
    const examB = makeExam({ id: 'exam-2', title: 'SQL Basics', examCode: 'EX-2' });
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u1', examId: 'exam-2', totalScore: 10, passed: false }),
      makeAttempt({ attemptId: 'a3', userId: 'u2', examId: 'exam-2', totalScore: 40, passed: true }),
    ];
    const rows = buildExamSummaries(attempts, attempts, [EXAM, examB], STUDENTS);
    expect(rows).toHaveLength(2);
    const examOneRow = rows.find((r) => r.examId === 'exam-1')!;
    const examTwoRow = rows.find((r) => r.examId === 'exam-2')!;
    expect(examOneRow.submitted).toBe(1);
    expect(examTwoRow.submitted).toBe(2);
    expect(examTwoRow.passed).toBe(1);
    expect(examTwoRow.failed).toBe(1);
  });

  it('passes through the exam category (for Exam Reports, which filters/exports by it)', () => {
    const examWithCategory = makeExam({ id: 'exam-1', title: 'C# Programming', category: 'Programming' });
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const rows = buildExamSummaries(attempts, attempts, [examWithCategory], STUDENTS);
    expect(rows[0].category).toBe('Programming');
  });
});

describe('buildExamSummaries with includeExamsWithNoSubmissions (Exam Reports - lists every filtered exam, zero-submission ones included)', () => {
  it('defaults to omitting an exam with no filtered results (Result Analytics behavior, unchanged)', () => {
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const examB = makeExam({ id: 'exam-2', title: 'SQL Basics' }); // never attempted
    const rows = buildExamSummaries(attempts, attempts, [EXAM, examB], STUDENTS);
    expect(rows).toHaveLength(1);
    expect(rows[0].examId).toBe('exam-1');
  });

  it('with includeExamsWithNoSubmissions, still emits a row for a zero-submission exam - Total Candidates/Not Submitted come from the real roster, not zeroed out along with everything else', () => {
    const attempts = [makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true })];
    const examB = makeExam({ id: 'exam-2', title: 'SQL Basics' }); // never attempted, no results at all
    const rows = buildExamSummaries(attempts, attempts, [EXAM, examB], STUDENTS, { includeExamsWithNoSubmissions: true });
    expect(rows).toHaveLength(2);
    const examTwoRow = rows.find((r) => r.examId === 'exam-2')!;
    expect(examTwoRow.examTitle).toBe('SQL Basics');
    expect(examTwoRow.totalCandidates).toBe(4); // the real eligible roster - not 0
    expect(examTwoRow.submitted).toBe(0);
    expect(examTwoRow.notSubmitted).toBe(4); // nobody in the roster submitted this one
    expect(examTwoRow.submittedAttempts).toBe(0);
    expect(examTwoRow.passed).toBe(0);
    expect(examTwoRow.failed).toBe(0);
    expect(examTwoRow.passPercent).toBe(0);
    expect(examTwoRow.averagePercent).toBe(0);
    expect(examTwoRow.highestPercent).toBe(0);
    expect(examTwoRow.lowestPercent).toBe(0);
    expect(examTwoRow.examDate).toBeNull();
    // exam-1's row is unaffected by the option - still just its own real numbers.
    const examOneRow = rows.find((r) => r.examId === 'exam-1')!;
    expect(examOneRow.submitted).toBe(1);
  });

  it('still counts Submitted as unique candidates (not raw attempt rows) with the option on - a retake does not inflate it, and the zero-submission exam alongside it is unaffected', () => {
    const attempts = [
      makeAttempt({ attemptId: 'a1', userId: 'u1', examId: 'exam-1', totalScore: 20, passed: false }),
      makeAttempt({ attemptId: 'a1-retake', userId: 'u1', examId: 'exam-1', totalScore: 45, passed: true }),
      makeAttempt({ attemptId: 'a2', userId: 'u2', examId: 'exam-1', totalScore: 30, passed: true }),
    ];
    const examB = makeExam({ id: 'exam-2', title: 'SQL Basics' });
    const rows = buildExamSummaries(attempts, attempts, [EXAM, examB], STUDENTS, { includeExamsWithNoSubmissions: true });
    const examOneRow = rows.find((r) => r.examId === 'exam-1')!;
    const examTwoRow = rows.find((r) => r.examId === 'exam-2')!;
    // u1 submitted twice, u2 once - 2 unique candidates, not 3 attempt rows;
    // 3 raw submitted-attempt records (Submitted Attempts, includes the retake).
    expect(examOneRow.submitted).toBe(2);
    expect(examOneRow.notSubmitted).toBe(2); // u3, u4
    expect(examOneRow.submittedAttempts).toBe(3);
    // a1 (failed), a1-retake (passed), a2 (passed) - 2 passed, 1 failed
    // attempt row, no per-candidate dedup (see the RETAKE / PASS-FAIL
    // ATTEMPT-SELECTION RULE note in advanceExamReport.ts).
    expect(examOneRow.passed).toBe(2);
    expect(examOneRow.failed).toBe(1);
    // The zero-submission exam still gets its own correct, independent row.
    expect(examTwoRow.submitted).toBe(0);
    expect(examTwoRow.notSubmitted).toBe(4);
    expect(examTwoRow.submittedAttempts).toBe(0);
  });
});
