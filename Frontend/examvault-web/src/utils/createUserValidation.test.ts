import { describe, expect, it } from 'vitest';
import { validateUserInformation } from './createUserValidation';
import type { UserInformationFields } from './createUserValidation';

const validForm: UserInformationFields = {
  fullName: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  phoneNumber: '9876543210',
};

describe('validateUserInformation', () => {
  it('returns no errors for fully valid input', () => {
    expect(validateUserInformation(validForm)).toEqual({});
  });

  it('requires a full name', () => {
    const errors = validateUserInformation({ ...validForm, fullName: '   ' });
    expect(errors.fullName).toBe('Full name is required.');
  });

  it('rejects a name containing digits', () => {
    const errors = validateUserInformation({ ...validForm, fullName: 'Priya123' });
    expect(errors.fullName).toBe('Enter a valid name (letters only).');
  });

  it('rejects a single-character name', () => {
    const errors = validateUserInformation({ ...validForm, fullName: 'P' });
    expect(errors.fullName).toBe('Enter a valid name (letters only).');
  });

  it('accepts a hyphenated/apostrophe name', () => {
    const errors = validateUserInformation({ ...validForm, fullName: "Jean-Luc O'Brien" });
    expect(errors.fullName).toBeUndefined();
  });

  it('accepts a name with an initial', () => {
    const errors = validateUserInformation({ ...validForm, fullName: 'A. Sharma' });
    expect(errors.fullName).toBeUndefined();
  });

  it('requires an email', () => {
    const errors = validateUserInformation({ ...validForm, email: '' });
    expect(errors.email).toBe('Email is required.');
  });

  it('rejects a malformed email', () => {
    const errors = validateUserInformation({ ...validForm, email: 'not-an-email' });
    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('requires a phone number', () => {
    const errors = validateUserInformation({ ...validForm, phoneNumber: '' });
    expect(errors.phoneNumber).toBe('Phone number is required.');
  });

  it('rejects a malformed phone number', () => {
    const errors = validateUserInformation({ ...validForm, phoneNumber: '123' });
    expect(errors.phoneNumber).toBe('Enter a valid phone number.');
  });
});
