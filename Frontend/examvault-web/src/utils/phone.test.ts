import { describe, expect, it } from 'vitest';
import { isValidPhone } from './phone';

describe('isValidPhone', () => {
  it('accepts a plain 10-digit number', () => {
    expect(isValidPhone('9876543210')).toBe(true);
  });

  it('accepts an Indian +91 formatted number', () => {
    expect(isValidPhone('+91 98765 43210')).toBe(true);
  });

  it('accepts a number with parentheses and hyphens', () => {
    expect(isValidPhone('+1 (202) 555-0198')).toBe(true);
  });

  it('rejects a number that is too short', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('rejects letters', () => {
    expect(isValidPhone('98765abcde')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidPhone('')).toBe(false);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(isValidPhone('  9876543210  ')).toBe(true);
  });
});
