import { describe, expect, it } from 'vitest';
import { formatRemaining } from './formatRemaining';

describe('formatRemaining', () => {
  it('formats minutes and seconds under an hour', () => {
    expect(formatRemaining(31 * 60 + 42)).toBe('31:42');
    expect(formatRemaining(5)).toBe('00:05');
  });
  it('adds hours when needed', () => {
    expect(formatRemaining(3600 + 62)).toBe('1:01:02');
  });
  it('never goes negative', () => {
    expect(formatRemaining(-10)).toBe('00:00');
  });
});
