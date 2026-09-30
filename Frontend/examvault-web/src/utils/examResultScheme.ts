// Maps an Exam Type's name to how its results should be labeled and which
// extra fields make sense to show, per the scope the user specified for
// each type (Assessment/Certification/Competitive/Entrance/Internal/Mock/
// Practice/Recruitment). Exam Types are admin-managed free-text records
// (see ManageExamTypes.tsx / ExamTypeOption), not a fixed backend enum, so
// this matches by the exact name the seeded types use today and falls back
// to a generic Pass/Fail scheme for any custom type an admin creates later.
//
// Certificate eligibility/generation is no longer part of this per-Exam-Type
// scheme - it's a per-exam setting instead (Edit Exam's "Certificate
// Generation" toggle/threshold, see certificateId.ts's isCertificateEligible
// and ExamPaper.CertificateEnabled/MinimumCertificateScorePercent), since a
// fixed per-type on/off flag couldn't express "this specific exam awards a
// certificate at 70%, that one doesn't award one at all" even within the
// same Exam Type. Recruitment's outcome is a direct pass/fail relabel
// (Selected/Rejected) - there's no multi-stage "Shortlisted" state anywhere
// in the data model.
export interface ExamResultScheme {
  passingLabel: string;
  outcomeLabels: { pass: string; fail: string };
  showRankPercentile: boolean;
  hasPassFailConcept: boolean;
  // Attempts beyond a student's first, distinct from the "Total Attempts"
  // column every type already shows - only meaningful for types where
  // re-attempting is the normal, expected pattern (Practice/Mock), not one
  // where a fixed exam sitting is the norm.
  showRepeatAttempts: boolean;
}

const DEFAULT_SCHEME: ExamResultScheme = {
  passingLabel: 'Passing',
  outcomeLabels: { pass: 'Pass', fail: 'Fail' },
  showRankPercentile: false,
  hasPassFailConcept: true,
  showRepeatAttempts: false,
};

const SCHEMES: Record<string, ExamResultScheme> = {
  'Assessment Exam': DEFAULT_SCHEME,
  'Internal Exam': DEFAULT_SCHEME,
  'Certification Exam': {
    passingLabel: 'Passing',
    outcomeLabels: { pass: 'Pass', fail: 'Fail' },
    showRankPercentile: false,
    hasPassFailConcept: true,
    showRepeatAttempts: false,
  },
  'Competitive Exam': {
    passingLabel: 'Qualifying Score',
    outcomeLabels: { pass: 'Qualified', fail: 'Not Qualified' },
    showRankPercentile: true,
    hasPassFailConcept: true,
    showRepeatAttempts: false,
  },
  'Entrance Exam': {
    passingLabel: 'Cut-off',
    outcomeLabels: { pass: 'Qualified', fail: 'Not Qualified' },
    showRankPercentile: true,
    hasPassFailConcept: true,
    showRepeatAttempts: false,
  },
  'Recruitment Exam': {
    passingLabel: 'Cut-off',
    outcomeLabels: { pass: 'Selected', fail: 'Rejected' },
    showRankPercentile: true,
    hasPassFailConcept: true,
    showRepeatAttempts: false,
  },
  'Mock Exam': {
    passingLabel: 'Passing',
    outcomeLabels: { pass: 'Pass', fail: 'Fail' },
    showRankPercentile: false,
    hasPassFailConcept: false,
    showRepeatAttempts: true,
  },
  'Practice Exam': {
    passingLabel: 'Passing',
    outcomeLabels: { pass: 'Pass', fail: 'Fail' },
    showRankPercentile: false,
    hasPassFailConcept: false,
    showRepeatAttempts: true,
  },
};

export function getExamResultScheme(typeName: string | undefined): ExamResultScheme {
  if (!typeName) return DEFAULT_SCHEME;
  return SCHEMES[typeName] ?? DEFAULT_SCHEME;
}

// Standard competition ranking (1, 2, 2, 4): rank = 1 + how many scores are
// strictly greater. Percentile = share of the cohort this score beats,
// 100 when there's nothing to compare against (a lone participant).
export function computeRank(scores: number[], score: number): number {
  return 1 + scores.filter((s) => s > score).length;
}

export function computePercentile(scores: number[], score: number): number {
  if (scores.length <= 1) return 100;
  const below = scores.filter((s) => s < score).length;
  return Math.round((below / (scores.length - 1)) * 100);
}
