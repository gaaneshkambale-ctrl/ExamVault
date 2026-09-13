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
}

const COLLEGE_FIELDS: FieldDef[] = [
  { key: 'university', label: 'University / Affiliating Body' },
  { key: 'accreditation', label: 'Accreditation' },
  { key: 'collegeCode', label: 'College / University Code' },
  { key: 'program', label: 'Program', placeholder: 'e.g. B.Tech Computer Engineering' },
  { key: 'department', label: 'Department' },
  { key: 'semester', label: 'Semester' },
  { key: 'division', label: 'Division / Class' },
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
    { key: 'module', label: 'Module' },
    { key: 'batch', label: 'Batch' },
    { key: 'trainer', label: 'Trainer' },
    { key: 'competencyFramework', label: 'Competency Framework' },
    { key: 'practicalTheoryRatio', label: 'Practical / Theory Ratio' },
  ],
  'Corporate / L&D': [
    { key: 'businessUnit', label: 'Business Unit' },
    { key: 'department', label: 'Department' },
    { key: 'trainingProgram', label: 'Training Program' },
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

export const RESULT_FIELD_CATALOG: FieldDef[] = [
  { key: 'studentName', label: 'Student / Candidate Name' },
  { key: 'studentId', label: 'Student / Candidate ID' },
  { key: 'examName', label: 'Exam / Assessment Name' },
  { key: 'examDate', label: 'Exam / Assessment Date' },
  { key: 'duration', label: 'Duration' },
  { key: 'marks', label: 'Marks' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'grade', label: 'Grade' },
  { key: 'result', label: 'Result (Pass / Fail)' },
  { key: 'rank', label: 'Rank' },
  { key: 'percentile', label: 'Percentile' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'correctAnswers', label: 'Correct Answers' },
  { key: 'incorrectAnswers', label: 'Incorrect Answers' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'qrVerification', label: 'QR Verification' },
];

export const RESULT_FIELD_KEYS_BY_TYPE: Record<string, string[]> = {
  College: ['studentName', 'studentId', 'examName', 'examDate', 'marks', 'percentage', 'grade', 'result', 'remarks'],
  University: ['studentName', 'studentId', 'examName', 'examDate', 'marks', 'percentage', 'grade', 'result', 'remarks'],
  School: ['studentName', 'studentId', 'examName', 'examDate', 'marks', 'percentage', 'grade', 'result', 'remarks'],
  'Coaching Institute': [
    'studentName',
    'studentId',
    'examName',
    'examDate',
    'duration',
    'marks',
    'percentage',
    'rank',
    'percentile',
    'accuracy',
    'correctAnswers',
    'incorrectAnswers',
    'unanswered',
    'result',
  ],
  'Training Institute': ['studentName', 'studentId', 'examName', 'duration', 'marks', 'percentage', 'grade', 'result', 'remarks'],
  'Corporate / L&D': ['studentName', 'examName', 'percentage', 'grade', 'result', 'remarks'],
  'Certification Institute': ['studentName', 'examName', 'percentage', 'grade', 'result', 'qrVerification'],
  'Recruitment / Hiring': ['studentName', 'examName', 'duration', 'percentage', 'rank', 'percentile', 'result', 'remarks'],
};

export const DEFAULT_RESULT_FIELD_KEYS: string[] = ['studentName', 'examName', 'marks', 'percentage', 'grade', 'result'];

export function getAcademicFieldsForType(organizationType: string | null | undefined): FieldDef[] {
  if (!organizationType) return DEFAULT_ACADEMIC_FIELDS;
  return ACADEMIC_FIELDS_BY_TYPE[organizationType] ?? DEFAULT_ACADEMIC_FIELDS;
}

export function getResultFieldKeysForType(organizationType: string | null | undefined): string[] {
  if (!organizationType) return DEFAULT_RESULT_FIELD_KEYS;
  return RESULT_FIELD_KEYS_BY_TYPE[organizationType] ?? DEFAULT_RESULT_FIELD_KEYS;
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
  College: [
    { key: 'enrollmentNo', label: 'Enrollment No.' },
    { key: 'prn', label: 'PRN / Registration No.' },
    { key: 'course', label: 'Course' },
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'year', label: 'Year' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'division', label: 'Division / Class' },
  ],
  University: [
    { key: 'enrollmentNo', label: 'Enrollment No.' },
    { key: 'prn', label: 'PRN / Registration No.' },
    { key: 'course', label: 'Course' },
    { key: 'program', label: 'Program' },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Semester' },
    { key: 'year', label: 'Year' },
    { key: 'academicYear', label: 'Academic Year' },
    { key: 'division', label: 'Division / Class' },
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
