// What the student dashboard should offer for a published exam, derived from the
// student's own attempt + assignment. UI only - StartAttemptHandler is the
// authority (attempt limit and scheduling window are enforced server-side).

export type ExamOffer = 'continue' | 'start' | 'retake' | 'none';

interface OfferInput {
  attempt: { status: string; attemptNumber: number } | null | undefined;
  maxAttempts: number;
  endAtUtc: string | null | undefined;
  now?: number;
}

export function getExamOffer({ attempt, maxAttempts, endAtUtc, now = Date.now() }: OfferInput): ExamOffer {
  if (attempt?.status === 'InProgress') {
    return 'continue';
  }
  if (endAtUtc && new Date(endAtUtc).getTime() < now) {
    return 'none';
  }
  if (!attempt) {
    return 'start';
  }
  return attempt.attemptNumber < maxAttempts ? 'retake' : 'none';
}
