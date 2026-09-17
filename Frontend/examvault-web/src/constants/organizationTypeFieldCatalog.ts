// Drives the "Academic Configuration" tab of Organization Settings - which
// organization-level fields and which result-report fields are relevant for
// a given Organization Type. Keyed by the type's NAME (matching whatever
// Super Admin has named it under Organization Types - see
// api/organizationTypesApi.ts), so a custom type Super Admin adds later
// falls back to DEFAULT_ACADEMIC_FIELDS/DEFAULT_RESULT_FIELD_KEYS below
// rather than showing nothing.
//
// This is intentionally a flat set of free-text organization-level fields
// (eg. "Grading System", "Passing %") - not per-student/per-exam data entry,
// which is captured elsewhere in the system. Storage-only for now (see
// Backend/.../OrganizationAcademicConfig.cs) - no PDF/report generator reads
// these yet.

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  // Every field in a Student/Exam "Academic Details" section is required by
  // default (see CreateUser.tsx/EditUser.tsx's validateAcademicFields) -
  // set true for a field that genuinely shouldn't block saving on its own,
  // eg. College/University's Course, which duplicates Program for most
  // students and was blocking real saves that had every OTHER field filled
  // in.
  optional?: boolean;
}

const COLLEGE_FIELDS: FieldDef[] = [
  { key: 'university', label: 'University / Affiliating Body' },
  { key: 'accreditation', label: 'Accreditation' },
  { key: 'collegeCode', label: 'College / University Code' },
  // Program/Department/Semester/Division intentionally NOT here - they used
  // to be single free-text boxes on this tab, but are now real per-tenant
  // managed lists (AcademicListItem) with their own "Program / Department /
  // Semester / Division Lists" card below, and cascading pickers wherever
  // they're actually captured (Student Academic Details, Exam academic
  // fields - see STUDENT_FIELDS_BY_TYPE/EXAM_FIELDS_BY_TYPE below). Keeping
  // both was confusing - two different "Program" concepts on one page.
  { key: 'gradingSystem', label: 'Grading System', placeholder: 'e.g. 10-point scale' },
  { key: 'passingPercent', label: 'Passing %' },
  { key: 'sgpaCgpa', label: 'SGPA / CGPA Scale' },
  { key: 'credits', label: 'Credits System' },
];

export const ACADEMIC_FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  College: COLLEGE_FIELDS,
  University: COLLEGE_FIELDS,
  School: [
    { key: 'board', label: 'Board', placeholder: 'e.g. CBSE, ICSE, State Board' },
    { key: 'schoolCode', label: 'School Code' },
    { key: 'classStructure', label: 'Class Structure', placeholder: 'e.g. Nursery - Class XII' },
    { key: 'gradingSystem', label: 'Grading System' },
    { key: 'passingPercent', label: 'Passing %' },
  ],
  'Coaching Institute': [
    { key: 'branch', label: 'Branch' },
    { key: 'course', label: 'Course' },
    { key: 'batch', label: 'Batch' },
    { key: 'testSeries', label: 'Test Series' },
    { key: 'rankingBasis', label: 'Ranking Basis', placeholder: 'e.g. Total marks across all subjects' },
  ],
  'Training Institute': [
    { key: 'trainingProgram', label: 'Training Program' },
    { key: 'trainingCenter', label: 'Training Center' },
    { key: 'module', label: 'Module' },
    { key: 'batch', label: 'Batch' },
    { key: 'trainer', label: 'Trainer' },
    { key: 'competencyFramework', label: 'Competency Framework' },
    { key: 'practicalTheoryRatio', label: 'Practical / Theory Ratio' },
  ],
  'Corporate / L&D': [
    { key: 'businessUnit', label: 'Business Unit' },
    { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'trainingProgram', label: 'Training Program' },
    { key: 'trainer', label: 'Trainer' },
    { key: 'batch', label: 'Batch' },
    { key: 'competencyFramework', label: 'Competency Framework' },
  ],
  'Certification Institute': [
    { key: 'certificationName', label: 'Certification Name' },
    { key: 'certificationLevel', label: 'Certification Level' },
    { key: 'validityPeriod', label: 'Validity Period', placeholder: 'e.g. 2 years from issue date' },
  ],
  'Recruitment / Hiring': [
    { key: 'position', label: 'Position / Role' },
    { key: 'department', label: 'Department' },
    { key: 'assessmentAreas', label: 'Assessment Areas', placeholder: 'e.g. Aptitude, Coding, Communication' },
  ],
};

export const DEFAULT_ACADEMIC_FIELDS: FieldDef[] = [];

// The 4 sections the Result Fields checklist is grouped into on screen -
// purely a UI grouping, doesn't affect which keys are relevant for a given
// Organization Type (that's still RESULT_FIELD_KEYS_BY_TYPE below).
export const RESULT_FIELD_GROUPS = [
  'Student Information',
  'Exam Information',
  'Result Information',
  'Additional Information',
] as const;
export type ResultFieldGroup = (typeof RESULT_FIELD_GROUPS)[number];

export interface ResultFieldDef extends FieldDef {
  group: ResultFieldGroup;
  // True for a field with no underlying per-attempt data captured ANYWHERE
  // in the system yet (no aptitude/coding/competency score, no module-wise
  // breakdown, no trainer remarks column - nothing for the PDF generator to
  // read even if this were checked). Rendered as a disabled "Coming soon"
  // checkbox rather than a live toggle, so the roadmap stays visible without
  // pretending these currently do anything. Building any of these out is a
  // real per-attempt scoring feature (comparable in size to the exam itself),
  // not a checkbox-wiring task.
  comingSoon?: boolean;
}

// Student / Candidate Name, Exam / Assessment Name, Marks, Percentage,
// Grade, and Result (Pass/Fail) are deliberately NOT in this catalog - they
// always appear on every generated report (a result PDF with no score or
// pass/fail status isn't a meaningfully smaller report, it's a broken one),
// so they're not offered as something to turn off. See the static note
// rendered above the checklist in OrganizationSettings.tsx.
//
// No "QR Verification" here either - Tenant.ShowQrCodeForVerification (the
// Reports & Documents tab's real, working QR toggle) already controls this;
// a second checkbox here would just be a disconnected duplicate of that
// control, same class of bug as the Program/Department free-text fields
// this catalog used to also duplicate.
export const RESULT_FIELD_CATALOG: ResultFieldDef[] = [
  { key: 'studentId', label: 'Student / Candidate ID', group: 'Student Information' },
  // Everything from STUDENT_FIELDS_BY_TYPE the student actually has set
  // (Department, Semester, Division/Class, Enrollment No., Course, Year,
  // Academic Year, etc.) except Program, which already has its own always-
  // shown field on the report - see getPopulatedStudentAcademicFields.
  { key: 'academicDetails', label: 'Academic Details (Department, Semester, Enrollment No., etc.)', group: 'Student Information' },
  { key: 'examDate', label: 'Exam / Assessment Date', group: 'Exam Information' },
  { key: 'duration', label: 'Duration', group: 'Exam Information' },
  { key: 'rank', label: 'Rank', group: 'Result Information' },
  { key: 'percentile', label: 'Percentile', group: 'Result Information' },
  { key: 'accuracy', label: 'Accuracy', group: 'Result Information' },
  // These 3 aren't independently gateable in the PDF - the Section-wise
  // Performance table, Score Distribution donut and Accuracy bars are one
  // shared visualization built from all three counts together, so checking
  // any one of them shows that whole block; unchecking all three hides it.
  // See generateResultPdf.ts's showAnswerBreakdown.
  { key: 'correctAnswers', label: 'Correct Answers', group: 'Result Information' },
  { key: 'incorrectAnswers', label: 'Incorrect Answers', group: 'Result Information' },
  { key: 'unanswered', label: 'Unanswered', group: 'Result Information' },
  { key: 'moduleWiseScore', label: 'Module-wise Score', group: 'Result Information', comingSoon: true },
  { key: 'practicalScore', label: 'Practical Score', group: 'Result Information', comingSoon: true },
  { key: 'theoryScore', label: 'Theory Score', group: 'Result Information', comingSoon: true },
  { key: 'competency', label: 'Competency', group: 'Result Information', comingSoon: true },
  { key: 'skills', label: 'Skills', group: 'Result Information', comingSoon: true },
  { key: 'aptitude', label: 'Aptitude', group: 'Result Information', comingSoon: true },
  { key: 'logicalReasoning', label: 'Logical Reasoning', group: 'Result Information', comingSoon: true },
  { key: 'technical', label: 'Technical', group: 'Result Information', comingSoon: true },
  { key: 'coding', label: 'Coding', group: 'Result Information', comingSoon: true },
  { key: 'communication', label: 'Communication', group: 'Result Information', comingSoon: true },
  { key: 'hiringStatus', label: 'Hiring Status', group: 'Result Information', comingSoon: true },
  { key: 'remarks', label: 'Remarks', group: 'Additional Information' },
  { key: 'attendance', label: 'Attendance', group: 'Additional Information', comingSoon: true },
  { key: 'trainerRemarks', label: 'Trainer Remarks', group: 'Additional Information', comingSoon: true },
  { key: 'recommendation', label: 'Recommendation', group: 'Additional Information', comingSoon: true },
];

export const RESULT_FIELD_KEYS_BY_TYPE: Record<string, string[]> = {
  College: ['studentId', 'academicDetails', 'examDate', 'remarks'],
  University: ['studentId', 'academicDetails', 'examDate', 'remarks'],
  School: ['studentId', 'academicDetails', 'examDate', 'attendance', 'remarks'],
  'Coaching Institute': [
    'studentId',
    'academicDetails',
    'examDate',
    'duration',
    'rank',
    'percentile',
    'accuracy',
    'correctAnswers',
    'incorrectAnswers',
    'unanswered',
  ],
  'Training Institute': ['studentId', 'academicDetails', 'duration', 'moduleWiseScore', 'practicalScore', 'theoryScore', 'trainerRemarks'],
  'Corporate / L&D': ['academicDetails', 'competency', 'skills', 'remarks'],
  'Certification Institute': ['academicDetails', 'competency'],
  'Recruitment / Hiring': [
    'academicDetails',
    'duration',
    'aptitude',
    'logicalReasoning',
    'technical',
    'coding',
    'communication',
    'percentile',
    'rank',
    'recommendation',
    'hiringStatus',
  ],
};

export const DEFAULT_RESULT_FIELD_KEYS: string[] = [];

export function getAcademicFieldsForType(organizationType: string | null | undefined): FieldDef[] {
  if (!organizationType) return DEFAULT_ACADEMIC_FIELDS;
  return ACADEMIC_FIELDS_BY_TYPE[organizationType] ?? DEFAULT_ACADEMIC_FIELDS;
}

export function getResultFieldKeysForType(organizationType: string | null | undefined): string[] {
  if (!organizationType) return DEFAULT_RESULT_FIELD_KEYS;
  return RESULT_FIELD_KEYS_BY_TYPE[organizationType] ?? DEFAULT_RESULT_FIELD_KEYS;
}

// The single source of truth for "does this Result Fields key currently
// show" - used by both the real generated PDF (generateResultPdf.ts) and
// the Reports & Documents tab's sample preview (OrganizationSettings.tsx),
// so the two can't independently drift out of sync the way the sample
// preview did before this function existed (it hand-duplicated the same
// logic and silently stopped matching real output). A key that isn't even
// offered as a checkbox for this Organization Type always shows - an admin
// can only hide a field they were actually given control over.
export function isResultFieldVisible(
  organizationType: string | null | undefined,
  enabledResultFields: string[] | null | undefined,
  key: string,
): boolean {
  if (!getResultFieldKeysForType(organizationType).includes(key)) {
    return true;
  }
  return !enabledResultFields || enabledResultFields.length === 0 || enabledResultFields.includes(key);
}

// Which fields to capture on a STUDENT record at Add/Edit User time - eg. a
// College student's Enrollment No./PRN/Semester, a Coaching Institute
// student's Batch. Deliberately excludes fields that already exist as real,
// native fields on every user regardless of type (Full Name, Email, Phone) -
// this catalog only covers what's genuinely type-specific and otherwise has
// nowhere to be captured. Stored per-user as AppUser.AcademicFieldsJson (see
// Backend/.../AppUser.cs) - only shown/collected when the user being
// added/edited has the Student role. Roll No. (AppUser.RollNumber, a real
// pre-existing column used elsewhere - Results tables, student pickers) is
// NOT part of this JSON catalog, but its on-screen LABEL is still dynamic -
// see ROLL_NUMBER_LABEL_BY_TYPE below - since "Roll No." reads oddly for a
// Corporate "Employee ID" or a Coaching Institute's "Student ID".
export const STUDENT_FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  // No separate Course field - confirmed against real stored data (see
  // getPopulatedStudentAcademicFields's own comment) that it's the same
  // real-world value as Program for a College/University student, so
  // there's nothing distinct for it to capture. Program's own on-screen
  // label becomes "Program/Course" (see CreateUser.tsx/EditUser.tsx's
  // `programLabel` prop) to make that merge visible rather than silent.
  College: [
    { key: 'enrollmentNo', label: 'Enrollment No.' },
    { key: 'prn', label: 'PRN / Registration No.' },
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'division', label: 'Division / Class' },
    { key: 'year', label: 'Year of Study' },
    { key: 'academicYear', label: 'Academic Year' },
  ],
  University: [
    { key: 'enrollmentNo', label: 'Enrollment No.' },
    { key: 'prn', label: 'PRN / Registration No.' },
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'division', label: 'Division / Class' },
    { key: 'year', label: 'Year of Study' },
    { key: 'academicYear', label: 'Academic Year' },
  ],
  School: [
    { key: 'admissionNo', label: 'Admission No.' },
    { key: 'class', label: 'Class' },
    { key: 'division', label: 'Division' },
    { key: 'academicYear', label: 'Academic Year' },
  ],
  'Coaching Institute': [
    { key: 'batch', label: 'Batch' },
    { key: 'course', label: 'Course' },
    { key: 'academicYear', label: 'Academic Year' },
  ],
  'Training Institute': [
    { key: 'batch', label: 'Batch' },
    { key: 'enrollmentDate', label: 'Enrollment Date' },
  ],
  'Corporate / L&D': [
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'manager', label: 'Manager' },
  ],
  'Certification Institute': [{ key: 'certificateNo', label: 'Certificate No.' }],
  'Recruitment / Hiring': [
    { key: 'applicationId', label: 'Application ID' },
    { key: 'position', label: 'Position' },
    { key: 'department', label: 'Department' },
  ],
};

export const DEFAULT_STUDENT_FIELDS: FieldDef[] = [];

export function getStudentFieldsForType(organizationType: string | null | undefined): FieldDef[] {
  if (!organizationType) return DEFAULT_STUDENT_FIELDS;
  return STUDENT_FIELDS_BY_TYPE[organizationType] ?? DEFAULT_STUDENT_FIELDS;
}

export interface PopulatedAcademicField {
  label: string;
  value: string;
}

// The fixed display order for the "Student & Academic Information" section
// of the Student Result PDF (generateResultPdf.ts) - matches exactly what
// was asked for a College/University-style report. PRN/Registration No.
// and Enrollment No. are deliberately NOT here - the caller reads those two
// directly so they can sit right after Roll No., before Program, at a
// fixed position in that section; this function only covers what comes
// after Program. Labels come straight from the catalog (STUDENT_FIELDS_BY_
// TYPE) - no override needed here.
const STUDENT_ACADEMIC_INFO_PRIORITY_KEYS = ['department', 'year', 'semester', 'division', 'academicYear'];

// The student's own type-specific academic fields that actually have a
// real value set, for the "Student & Academic Information" section of the
// Student Result PDF, in the fixed order above - then any OTHER field this
// Organization Type's own catalog defines (eg. a School's Admission No./
// Class, a Coaching Institute's Course/Batch) that isn't already covered
// by that fixed order or shown separately by the caller (Program, PRN,
// Enrollment No.), so a non-College/University tenant still sees its own
// fields rather than losing them entirely. College/University's catalog
// has no separate Course key at all (see STUDENT_FIELDS_BY_TYPE's own
// comment - it's the same real-world value as Program there), so there's
// nothing to exclude for those two; a Coaching Institute's real Course
// field passes through here untouched, same as any other of its fields.
// Only ever returns fields the student genuinely has a value for; never
// fabricates a placeholder for a blank one, and returns an empty array (no
// panel drawn at all) for a student/org type with nothing set.
export function getPopulatedStudentAcademicFields(
  organizationType: string | null | undefined,
  academicFields: Record<string, string> | null | undefined,
): PopulatedAcademicField[] {
  if (!academicFields) return [];
  const catalog = getStudentFieldsForType(organizationType);
  const labelByKey = new Map(catalog.map((field) => [field.key, field.label]));
  const priorityKeys = new Set(STUDENT_ACADEMIC_INFO_PRIORITY_KEYS);

  const prioritized = STUDENT_ACADEMIC_INFO_PRIORITY_KEYS.filter((key) => labelByKey.has(key) && academicFields[key]).map((key) => ({
    label: labelByKey.get(key)!,
    value: academicFields[key],
  }));
  const remainder = catalog
    .filter(
      (field) =>
        field.key !== 'program' &&
        field.key !== 'prn' &&
        field.key !== 'enrollmentNo' &&
        !priorityKeys.has(field.key) &&
        academicFields[field.key],
    )
    .map((field) => ({ label: field.label, value: academicFields[field.key] }));

  return [...prioritized, ...remainder];
}

// Display label only - the underlying field is always the same real
// AppUser.RollNumber column, just called something different depending on
// organization type.
export const ROLL_NUMBER_LABEL_BY_TYPE: Record<string, string> = {
  College: 'Roll No.',
  University: 'Roll No.',
  School: 'Roll No.',
  'Coaching Institute': 'Student ID',
  'Training Institute': 'Trainee ID',
  'Corporate / L&D': 'Employee ID',
  'Certification Institute': 'Candidate ID',
  'Recruitment / Hiring': 'Candidate ID',
};

export const DEFAULT_ROLL_NUMBER_LABEL = 'Roll No. / ID';

export function getRollNumberLabelForType(organizationType: string | null | undefined): string {
  if (!organizationType) return DEFAULT_ROLL_NUMBER_LABEL;
  return ROLL_NUMBER_LABEL_BY_TYPE[organizationType] ?? DEFAULT_ROLL_NUMBER_LABEL;
}

// Which fields to capture on an EXAM at Create/Edit Exam time - eg. a
// College's Semester, a Coaching Institute's Test Series. Deliberately
// excludes fields the exam already has natively regardless of org type
// (Title, Category, Duration, Total Marks, Passing Marks, Exam Type) - this
// catalog only covers what's genuinely type-specific and otherwise has
// nowhere to be captured. Stored as ExamPaper.AcademicFieldsJson (see
// Backend/.../ExamPaper.cs) - same flexible-schema reasoning as the
// Organization/Student catalogs above.
export const EXAM_FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  College: [
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    // Optional, unlike Program/Department/Semester - an exam scoped to just
    // Program/Department/Semester leaves Division unrestricted ("All
    // Divisions") in the Assign Exam eligibility check, same convention as
    // an exam with no scope keys at all being fully unrestricted.
    { key: 'division', label: 'Division / Class', optional: true },
    { key: 'examDate', label: 'Exam Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  University: [
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'division', label: 'Division / Class', optional: true },
    { key: 'examDate', label: 'Exam Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  School: [
    { key: 'term', label: 'Term' },
    { key: 'subject', label: 'Subject' },
    { key: 'examDate', label: 'Exam Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  'Coaching Institute': [
    { key: 'testSeries', label: 'Test Series' },
    { key: 'testDate', label: 'Test Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  'Training Institute': [
    { key: 'course', label: 'Course' },
    { key: 'module', label: 'Module' },
    { key: 'assessmentDate', label: 'Assessment Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  'Corporate / L&D': [
    { key: 'trainingPeriod', label: 'Training Period' },
    { key: 'assessmentDate', label: 'Assessment Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
  'Certification Institute': [
    { key: 'examDate', label: 'Exam Date', placeholder: 'e.g. 12 Apr 2026' },
    { key: 'validFrom', label: 'Valid From' },
    { key: 'validUntil', label: 'Valid Until' },
  ],
  'Recruitment / Hiring': [
    { key: 'assessmentType', label: 'Assessment Type', placeholder: 'e.g. Technical, Aptitude, Coding' },
    { key: 'assessmentDate', label: 'Assessment Date', placeholder: 'e.g. 12 Apr 2026' },
  ],
};

export const DEFAULT_EXAM_FIELDS: FieldDef[] = [];

export function getExamFieldsForType(organizationType: string | null | undefined): FieldDef[] {
  if (!organizationType) return DEFAULT_EXAM_FIELDS;
  return EXAM_FIELDS_BY_TYPE[organizationType] ?? DEFAULT_EXAM_FIELDS;
}

// The only keys CreateAssignmentHandler's eligibility check compares
// (Backend/.../CreateAssignmentHandler.cs's own ScopeKeys) - out of
// whatever EXAM_FIELDS_BY_TYPE an org type has, only these four
// participate in "is this student eligible for this exam". Today that's
// College/University only - School/Coaching/etc.'s own exam fields (Term,
// Test Series, ...) aren't scope-relevant, so the "Restrict exam to
// academic group" toggle has nothing to restrict for them and stays
// hidden.
const EXAM_SCOPE_KEYS = ['program', 'department', 'semester', 'division'];

export function hasExamAcademicScope(organizationType: string | null | undefined): boolean {
  return getExamFieldsForType(organizationType).some((field) => EXAM_SCOPE_KEYS.includes(field.key));
}
