// Student-level summary rows for the Student Reports export (StudentReports.tsx)
// - kept separate from that page's own on-screen StudentAgg/buildAggregates
// (unchanged by this) the same way examSummary.ts's buildExamSummaries is
// kept separate from AdminReports.tsx's own on-screen perExamStats: this is
// purely additive to the export, not a replacement for what's already on
// screen. Pulled into a pure function so it can be unit-tested the same way
// every other export data-shaping function in this codebase already is.
import { percentOf } from './examSummary';
import type { AdminAttemptResultResponse } from '../types/result';
import type { StudentSummary } from '../types/user';

export interface StudentSummaryRow {
  userId: string;
  fullName: string;
  email: string;
  /** AppUser.RollNumber - a real, native column (not part of academicFields), labeled "Registration No."/"Student ID"/etc. per Organization Type elsewhere in the app. Null when never set. */
  registrationNo: string | null;
  /**
   * Program/Department/Semester/Division - from the student's own
   * academicFields (Organization Settings' per-Organization-Type catalog,
   * keys 'program'/'department'/'semester'/'division'; see
   * AcademicHierarchyFields.tsx's own comment for why values are plain
   * strings there, not item ids). Null whenever the student has no value
   * for that specific key - including every student at an Organization
   * Type that doesn't collect it at all (eg. a Coaching Institute uses
   * Batch/Course instead - see STUDENT_FIELDS_BY_TYPE in
   * organizationTypeFieldCatalog.ts). Never defaulted/fabricated.
   */
  program: string | null;
  department: string | null;
  semester: string | null;
  division: string | null;
  /** Submitted/auto-submitted result records in the current filter window - a raw count, can include more than one per exam if the student retook it. Same definition this page's on-screen "Exams Attempted" column already uses; not deduped by exam. */
  examsSubmitted: number;
  /** Existing per-attempt AdminAttemptResultResponse.passed, same rule every other report in this app uses (no per-candidate dedup for retakes). */
  examsPassed: number;
  examsFailed: number;
  averagePercent: number;
  highestPercent: number;
  lowestPercent: number;
  passPercent: number;
  /** Raw ISO string - left unformatted so callers can render it however they need. */
  lastAttemptUtc: string;
}

/**
 * Builds one summary row per student who has at least one result in
 * `filteredResults` - the same "only students with activity in the current
 * filters" population StudentReports.tsx's own on-screen table already
 * uses (a student with zero attempts in the window is omitted, not shown
 * with 0s - unlike Exam Reports' export, which deliberately does the
 * opposite for exams; the two pages' existing on-screen behavior already
 * differed this way before this export was touched, so this preserves each
 * one rather than unifying them).
 */
export function buildStudentSummaries(filteredResults: AdminAttemptResultResponse[], students: StudentSummary[]): StudentSummaryRow[] {
  const byStudent = new Map<string, AdminAttemptResultResponse[]>();
  for (const r of filteredResults) {
    const list = byStudent.get(r.userId) ?? [];
    list.push(r);
    byStudent.set(r.userId, list);
  }

  const rows: StudentSummaryRow[] = [];
  for (const student of students) {
    const attempts = byStudent.get(student.id);
    if (!attempts || attempts.length === 0) continue;

    const pcts = attempts.map(percentOf);
    const passedCount = attempts.filter((a) => a.passed).length;
    const academicFields = student.academicFields;

    rows.push({
      userId: student.id,
      fullName: student.fullName,
      email: student.email,
      registrationNo: student.rollNumber,
      program: academicFields?.program ?? null,
      department: academicFields?.department ?? null,
      semester: academicFields?.semester ?? null,
      division: academicFields?.division ?? null,
      examsSubmitted: attempts.length,
      examsPassed: passedCount,
      examsFailed: attempts.length - passedCount,
      averagePercent: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      highestPercent: Math.round(Math.max(...pcts)),
      lowestPercent: Math.round(Math.min(...pcts)),
      passPercent: Math.round((passedCount / attempts.length) * 100),
      lastAttemptUtc: attempts.reduce((max, a) => (a.submittedAtUtc > max ? a.submittedAtUtc : max), attempts[0].submittedAtUtc),
    });
  }
  return rows;
}
