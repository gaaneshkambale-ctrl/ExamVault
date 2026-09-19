// Same pattern CreateOrganization.tsx's Admin Phone Number field and the
// backend (CreateUserValidator.cs, CreateTenantAdminValidator.cs) already
// use - digits, an optional leading +, spaces, hyphens and parentheses,
// 7-20 characters.
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}
