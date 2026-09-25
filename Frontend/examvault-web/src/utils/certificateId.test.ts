import { describe, expect, it } from 'vitest';
import { getCertificateId, isCertificateEligible } from './certificateId';
import type { ResultSummaryResponse } from '../types/result';

function makeResult(overrides: Partial<ResultSummaryResponse> & Pick<ResultSummaryResponse, 'totalScore' | 'totalMarks' | 'passed'>): ResultSummaryResponse {
  return {
    attemptId: 'attempt-1',
    examId: 'exam-1',
    examTitle: 'C# Programming',
    passingMarks: 20,
    submittedAtUtc: new Date('2026-01-01T10:00:00Z').toISOString(),
    questions: null,
    hasPendingGrading: false,
    correctCount: 4,
    incorrectCount: 1,
    skippedCount: 0,
    accuracy: 80,
    rank: null,
    percentile: null,
    totalParticipants: null,
    averageAccuracy: null,
    ...overrides,
  };
}

describe('isCertificateEligible', () => {
  it('is not eligible when the exam has certificate generation disabled, regardless of score', () => {
    const result = makeResult({ totalScore: 50, totalMarks: 50, passed: true });
    expect(isCertificateEligible(result, { certificateEnabled: false, minimumCertificateScorePercent: 0 })).toBe(false);
  });

  it('is not eligible when no exam data is available (loading/missing) - never assumes eligible by default', () => {
    const result = makeResult({ totalScore: 50, totalMarks: 50, passed: true });
    expect(isCertificateEligible(result, null)).toBe(false);
    expect(isCertificateEligible(result, undefined)).toBe(false);
  });

  it('is eligible when enabled, passed, and the score meets the exam\'s own configured minimum', () => {
    const result = makeResult({ totalScore: 35, totalMarks: 50, passed: true }); // 70%
    expect(isCertificateEligible(result, { certificateEnabled: true, minimumCertificateScorePercent: 70 })).toBe(true);
  });

  it('is not eligible when the score falls short of the exam\'s own configured minimum, even if passed', () => {
    const result = makeResult({ totalScore: 30, totalMarks: 50, passed: true }); // 60%
    expect(isCertificateEligible(result, { certificateEnabled: true, minimumCertificateScorePercent: 70 })).toBe(false);
  });

  it('is not eligible when failed, even if the score would otherwise clear the minimum', () => {
    const result = makeResult({ totalScore: 40, totalMarks: 50, passed: false }); // 80%
    expect(isCertificateEligible(result, { certificateEnabled: true, minimumCertificateScorePercent: 70 })).toBe(false);
  });

  it('respects a per-exam minimum lower than the old fixed 80% default', () => {
    const result = makeResult({ totalScore: 36, totalMarks: 50, passed: true }); // 72%
    expect(isCertificateEligible(result, { certificateEnabled: true, minimumCertificateScorePercent: 70 })).toBe(true);
    expect(isCertificateEligible(result, { certificateEnabled: true, minimumCertificateScorePercent: 80 })).toBe(false);
  });
});

describe('getCertificateId', () => {
  it('is deterministic for the same attempt - no persisted record to look one up in', () => {
    const result = makeResult({ totalScore: 45, totalMarks: 50, passed: true, attemptId: 'attempt-abc' });
    expect(getCertificateId(result)).toBe(getCertificateId(result));
  });
});
