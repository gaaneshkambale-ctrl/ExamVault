// Point 14 of the "Organization Type -> Configuration Template -> Result
// Engine" architecture doc: a named catalog of report TYPES, gated by
// Organization Type - not just one fixed "Exam Result PDF" for everyone.
//
// Scope decision, consistent with points 12/13 this session: this maps to
// the report outputs that actually exist and compute real data today
// (Student Result, Exam Result booklet, Detailed Exam Report, Certificate)
// rather than inventing 4 more report generators (Performance Report,
// Academic Result, Assessment Report, Custom Report) with no underlying
// computation to back them - the same "don't fabricate what has nowhere to
// be captured" reasoning already applied to points 4-8's newer fields.
// Certificate eligibility is ALSO already gated per-exam by Exam Type (see
// examResultScheme.ts's showCertificate) - this catalog adds the missing
// second axis, Organization Type, on top of that existing one.
export type ReportTypeKey = 'studentResult' | 'examResultBooklet' | 'detailedExamReport' | 'certificate';

export interface ReportTypeDef {
  key: ReportTypeKey;
  label: string;
  description: string;
}

export const REPORT_TYPE_CATALOG: ReportTypeDef[] = [
  { key: 'studentResult', label: 'Student Result', description: "One student's own result for a single exam." },
  {
    key: 'examResultBooklet',
    label: 'Exam Result',
    description: "Every student's individual result for one exam, combined into a single PDF.",
  },
  {
    key: 'detailedExamReport',
    label: 'Detailed Exam Report',
    description: 'Class-wide analytics for one exam - averages, score distribution, rank/percentile.',
  },
  { key: 'certificate', label: 'Certificate', description: 'A one-page certificate of achievement for a passing result.' },
];

export const REPORT_TYPES_BY_ORG_TYPE: Record<string, ReportTypeKey[]> = {
  College: ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'],
  University: ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'],
  School: ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'],
  // Doc's Coaching list is Student/Test Result, Rank/Percentile Report,
  // Performance Analysis - all already served by studentResult (rank on the
  // PDF itself, point 13) and detailedExamReport (the Advance Report). No
  // Certificate for a coaching test series.
  'Coaching Institute': ['studentResult', 'examResultBooklet', 'detailedExamReport'],
  'Training Institute': ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'],
  'Corporate / L&D': ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'],
  // Doc's Recruitment list (Shortlist Report) is a relabeled Detailed Exam
  // Report/Student Result, not a distinct output - no Certificate for a
  // hiring assessment.
  'Recruitment / Hiring': ['studentResult', 'examResultBooklet', 'detailedExamReport'],
  // The certificate itself IS the primary artifact here - class-wide
  // booklet exports make little sense for a certification exam typically
  // taken individually, so left out.
  'Certification Institute': ['studentResult', 'detailedExamReport', 'certificate'],
};

export const DEFAULT_REPORT_TYPES: ReportTypeKey[] = ['studentResult', 'examResultBooklet', 'detailedExamReport', 'certificate'];

export function getReportTypesForOrgType(organizationType: string | null | undefined): ReportTypeKey[] {
  if (!organizationType) return DEFAULT_REPORT_TYPES;
  return REPORT_TYPES_BY_ORG_TYPE[organizationType] ?? DEFAULT_REPORT_TYPES;
}

export function isReportTypeAvailable(organizationType: string | null | undefined, key: ReportTypeKey): boolean {
  return getReportTypesForOrgType(organizationType).includes(key);
}
