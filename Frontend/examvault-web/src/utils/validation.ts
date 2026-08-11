import type { RegisterRequest } from '../types/user';

export interface RegisterFormState extends RegisterRequest {
  confirmPassword: string;
}

export function validate(
  form: RegisterFormState,
): Partial<Record<keyof RegisterFormState, string>> {
  const errors: Partial<Record<keyof RegisterFormState, string>> = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    errors.password = 'Password needs an uppercase letter, a lowercase letter, and a digit.';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
