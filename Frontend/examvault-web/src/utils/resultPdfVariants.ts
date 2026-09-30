// Point 13 of the "Organization Type -> Configuration Template -> Result
// Engine" architecture doc. Originally drove genuinely different result PDF
// LAYOUTS per Organization Type (a compact academic layout for College/
// University/School, a richer multi-panel dashboard for everything else) -
// that second layout (drawStudentReport in generateResultPdf.ts) was removed
// at the user's explicit request, so every Organization Type now renders
// through the same compact academic layout (drawAcademicReport). This file
// still exists purely to vary the report's COPY/TONE per type (title,
// tagline, pass/fail wording) via RESULT_PDF_VARIANT_COPY below - eg. a
// Certification Institute's report says "Certified"/"Not Certified" where a
// College's says "Passed"/"Failed", even though both use the identical
// layout.
//
// Keyed by the same Organization Type NAME as organizationTypeFieldCatalog.ts
// (Super Admin's Organization Types list), not by a fixed enum - a custom
// type falls back to 'academic' rather than showing nothing.
export type ResultPdfVariant = 'academic' | 'coaching' | 'training' | 'corporate' | 'recruitment' | 'certification';

const VARIANT_BY_ORG_TYPE: Record<string, ResultPdfVariant> = {
  College: 'academic',
  University: 'academic',
  School: 'academic',
  'Coaching Institute': 'coaching',
  'Training Institute': 'training',
  'Corporate / L&D': 'corporate',
  'Recruitment / Hiring': 'recruitment',
  'Certification Institute': 'certification',
};

export function getResultPdfVariant(organizationType: string | null | undefined): ResultPdfVariant {
  if (!organizationType) return 'academic';
  return VARIANT_BY_ORG_TYPE[organizationType] ?? 'academic';
}

export interface ResultPdfVariantCopy {
  title: string;
  tagline: string;
  /**
   * Short (<=10 char) status words for the narrow "Result Status" stat card
   * at the top of the report - that card draws its value at a fixed x/y
   * with no wrapping or auto-shrink (see pdfReportKit.ts's drawStatCard),
   * so a long phrase silently overflows past the card's ~42mm width rather
   * than erroring. Deliberately shorter than the headline/body pair below,
   * which live in the much wider amber Remarks panel instead.
   */
  statusLabel: { passed: string; failed: string };
  passedHeadline: string;
  failedHeadline: string;
  passedBody: string;
  failedBody: string;
}

export const RESULT_PDF_VARIANT_COPY: Record<ResultPdfVariant, ResultPdfVariantCopy> = {
  academic: {
    title: 'Official Examination Report',
    tagline: 'Your Learning Journey, Our Commitment',
    statusLabel: { passed: 'Passed', failed: 'Failed' },
    passedHeadline: 'Good Performance!',
    failedHeadline: 'Needs Improvement',
    passedBody: 'You have passed this exam. Keep up the good work!',
    failedBody: 'You did not meet the passing criteria this time. Review the weak sections above and try again.',
  },
  coaching: {
    title: 'Test Result Report',
    tagline: 'Track Your Rank, Fuel Your Prep',
    statusLabel: { passed: 'Qualified', failed: 'Failed' },
    passedHeadline: 'Qualified',
    failedHeadline: 'Not Qualified',
    passedBody: 'You have qualified this test. Keep up the momentum for the next one!',
    failedBody: 'You did not qualify this time. Review your rank and weak sections above and keep practicing.',
  },
  training: {
    title: 'Training Assessment Report',
    tagline: 'Skill Building, One Assessment at a Time',
    statusLabel: { passed: 'Passed', failed: 'Failed' },
    passedHeadline: 'Passed',
    failedHeadline: 'Needs Improvement',
    passedBody: 'You have successfully passed this training assessment.',
    failedBody: 'You did not meet the passing criteria this time. Review the breakdown above with your trainer.',
  },
  corporate: {
    title: 'Employee Assessment Report',
    tagline: 'Building Capability, Enabling Growth',
    statusLabel: { passed: 'Passed', failed: 'Failed' },
    passedHeadline: 'Passed',
    failedHeadline: 'Needs Improvement',
    passedBody: 'You have successfully passed this assessment.',
    failedBody: 'You did not meet the passing criteria this time. Discuss the results with your manager.',
  },
  recruitment: {
    title: 'Candidate Assessment Report',
    tagline: 'Assessing Talent, Enabling Great Hires',
    statusLabel: { passed: 'Shortlisted', failed: 'Rejected' },
    passedHeadline: 'Shortlisted',
    failedHeadline: 'Not Shortlisted',
    passedBody: 'This candidate has cleared the assessment and is recommended for the next round.',
    failedBody: 'This candidate did not meet the qualifying criteria for this assessment.',
  },
  certification: {
    title: 'Certification Result Report',
    tagline: 'Verified Skills, Recognized Achievement',
    statusLabel: { passed: 'Certified', failed: 'Failed' },
    passedHeadline: 'Certified',
    failedHeadline: 'Not Certified',
    passedBody: 'Congratulations - you have earned this certification.',
    failedBody: 'You did not meet the passing criteria for certification this time.',
  },
};
