import { describe, expect, it } from 'vitest';
import { getExamOffer } from './studentExamAvailability';

const NOW = new Date('2026-09-30T12:00:00Z').getTime();
const future = '2026-10-01T12:00:00Z';
const past = '2026-09-29T12:00:00Z';

describe('getExamOffer', () => {
  it('offers Start when there is no attempt yet', () => {
    expect(getExamOffer({ attempt: null, maxAttempts: 1, endAtUtc: future, now: NOW })).toBe('start');
  });
  it('offers Continue for an in-progress attempt', () => {
    expect(getExamOffer({ attempt: { status: 'InProgress', attemptNumber: 1 }, maxAttempts: 1, endAtUtc: future, now: NOW })).toBe('continue');
  });
  it('offers nothing once the attempt limit is used up', () => {
    expect(getExamOffer({ attempt: { status: 'Submitted', attemptNumber: 1 }, maxAttempts: 1, endAtUtc: future, now: NOW })).toBe('none');
  });
  it('offers Retake while attempts remain', () => {
    expect(getExamOffer({ attempt: { status: 'Submitted', attemptNumber: 1 }, maxAttempts: 3, endAtUtc: future, now: NOW })).toBe('retake');
  });
  it('offers nothing after the window closes, even with attempts left', () => {
    expect(getExamOffer({ attempt: null, maxAttempts: 3, endAtUtc: past, now: NOW })).toBe('none');
  });
  it('still lets an in-progress attempt continue after the window closes (auto-submit handles it)', () => {
    expect(getExamOffer({ attempt: { status: 'InProgress', attemptNumber: 1 }, maxAttempts: 1, endAtUtc: past, now: NOW })).toBe('continue');
  });
  it('treats an exam with no window as open', () => {
    expect(getExamOffer({ attempt: null, maxAttempts: 1, endAtUtc: null, now: NOW })).toBe('start');
  });
});
