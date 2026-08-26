import type { ResultSummaryResponse } from '../types/result';

// No certificate is persisted anywhere (see MyCertificates.tsx) - everything
// here is derived client-side from the result itself, so the same attempt
// always produces the same ID without a backend record to look one up in.
function hashToNumber(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function examCode(title: string): string {
  const code = title
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
  return code || 'EX';
}

export function getCertificateId(result: ResultSummaryResponse): string {
  const year = new Date(result.submittedAtUtc).getFullYear();
  const sequence = 100000 + (hashToNumber(result.attemptId) % 900000);
  return `EV-${examCode(result.examTitle)}-${year}-${sequence}`;
}

export const CERTIFICATE_MIN_PERCENTAGE = 80;

// Passing isn't enough on its own - a certificate is only earned at 80%+.
export function isCertificateEligible(result: ResultSummaryResponse): boolean {
  const percentage = result.totalMarks > 0 ? (result.totalScore / result.totalMarks) * 100 : 0;
  return result.passed && percentage >= CERTIFICATE_MIN_PERCENTAGE;
}
