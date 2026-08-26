import { isAxiosError } from 'axios';

type StatusOverrides = Record<number, string>;

interface ApiErrorPayload {
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extracts a user-facing message from a failed API call. Checks, in order:
 * a caller-supplied override for the response status, FluentValidation-style
 * `errors` dictionaries, a plain `message` field, then ASP.NET ProblemDetails'
 * `detail` field - falling back to a generic message only if the backend
 * genuinely sent nothing usable.
 */
export function extractServerError(
  error: unknown,
  overrides: StatusOverrides = {},
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && overrides[status]) {
      return overrides[status];
    }

    const data = error.response?.data as ApiErrorPayload | undefined;
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ');
    }
    if (data?.message) {
      return data.message;
    }
    if (data?.detail) {
      return data.detail;
    }
  }
  return fallback;
}
