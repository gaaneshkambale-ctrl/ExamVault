import { describe, expect, it } from 'vitest';
import { formatTypedValue, parseTypedValue } from './typedValue';

describe('parseTypedValue', () => {
  it('parses an Int', () => {
    expect(parseTypedValue('34', 'Int')).toBe(34);
  });

  it('parses a Double', () => {
    expect(parseTypedValue('3.5', 'Double')).toBe(3.5);
  });

  it('parses a Boolean', () => {
    expect(parseTypedValue('true', 'Boolean')).toBe(true);
    expect(parseTypedValue('false', 'Boolean')).toBe(false);
  });

  it('parses a String as-is', () => {
    expect(parseTypedValue('hello', 'String')).toBe('hello');
  });

  it('parses an IntArray', () => {
    expect(parseTypedValue('12, 35, 1, 10, 34, 1', 'IntArray')).toEqual([12, 35, 1, 10, 34, 1]);
  });

  it('parses a StringArray', () => {
    expect(parseTypedValue('apple, banana', 'StringArray')).toEqual(['apple', 'banana']);
  });

  it('parses an empty array as []', () => {
    expect(parseTypedValue('', 'IntArray')).toEqual([]);
  });
});

describe('formatTypedValue', () => {
  it('round-trips an IntArray', () => {
    const parsed = parseTypedValue('12, 35, 1', 'IntArray');
    expect(formatTypedValue(parsed, 'IntArray')).toBe('12, 35, 1');
  });

  it('round-trips a scalar Int', () => {
    expect(formatTypedValue(34, 'Int')).toBe('34');
  });

  it('formats a Boolean', () => {
    expect(formatTypedValue(true, 'Boolean')).toBe('true');
  });
});
