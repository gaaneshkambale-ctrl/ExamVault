import { isValidEmail } from './email';
import { isValidPhone } from './phone';

// Must start with a letter, then any run of letters/spaces/periods/
// apostrophes/hyphens (up to the backend's own 200-char MaximumLength) -
// \p{L} is any Unicode letter, not just A-Z, so this doesn't reject
// accented or non-Latin names. Allows "Jean-Luc", "O'Brien", "A. Sharma";
// rejects a name that's only digits/symbols or a single character.
const NAME_PATTERN = /^\p{L}[\p{L} .'-]{1,199}$/u;

export interface UserInformationFields {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export type UserInformationErrors = Partial<Record<keyof UserInformationFields, string>>;

// The Add New User wizard's "User Information" step (CreateUser.tsx).
export function validateUserInformation(form: UserInformationFields): UserInformationErrors {
  const errors: UserInformationErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (!NAME_PATTERN.test(form.fullName.trim())) {
    errors.fullName = 'Enter a valid name (letters only).';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.phoneNumber?.trim()) {
    errors.phoneNumber = 'Phone number is required.';
  } else if (!isValidPhone(form.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid phone number.';
  }

  return errors;
}
