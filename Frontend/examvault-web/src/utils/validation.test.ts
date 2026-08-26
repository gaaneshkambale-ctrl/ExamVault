import { describe, expect, it } from 'vitest';
import { validate } from './validation';
import type { RegisterFormState } from './validation';

const validForm: RegisterFormState = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Passw0rd',
  confirmPassword: 'Passw0rd',
};

describe('validate', () => {
  it('returns no errors for fully valid input', () => {
    expect(validate(validForm)).toEqual({});
  });

  it('requires full name', () => {
    const errors = validate({ ...validForm, fullName: '   ' });
    expect(errors.fullName).toBe('Full name is required.');
  });

  it('requires email', () => {
    const errors = validate({ ...validForm, email: '' });
    expect(errors.email).toBe('Email is required.');
  });

  it('rejects an invalid email format', () => {
    const errors = validate({ ...validForm, email: 'not-an-email' });
    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('requires a password', () => {
    const errors = validate({ ...validForm, password: '', confirmPassword: '' });
    expect(errors.password).toBe('Password is required.');
  });

  it('rejects a password shorter than 8 characters', () => {
    const errors = validate({ ...validForm, password: 'Ab1', confirmPassword: 'Ab1' });
    expect(errors.password).toBe('Password must be at least 8 characters.');
  });

  it.each([
    ['no uppercase letter', 'passw0rd'],
    ['no lowercase letter', 'PASSW0RD'],
    ['no digit', 'Password'],
  ])('rejects a password with %s', (_label, password) => {
    const errors = validate({ ...validForm, password, confirmPassword: password });
    expect(errors.password).toBe(
      'Password needs an uppercase letter, a lowercase letter, and a digit.',
    );
  });

  it('rejects a confirmPassword that does not match password', () => {
    const errors = validate({ ...validForm, confirmPassword: 'Different1' });
    expect(errors.confirmPassword).toBe('Passwords do not match.');
  });
});
