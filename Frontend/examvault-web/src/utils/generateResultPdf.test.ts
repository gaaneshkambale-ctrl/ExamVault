import { describe, expect, it, vi, beforeEach } from 'vitest';
import { computeExamResultSummary, generateExamResultsBooklet, generateResultPdf } from './generateResultPdf';
import type { ExamResultBookletEntry } from './generateResultPdf';
import type { AdminAttemptResultResponse } from '../types/result';
import { loadTenantBranding } from './pdfReportKit';
import type { TenantBranding } from './pdfReportKit';

// Only loadTenantBranding is overridden - every drawing helper (panel,
// fieldRow, drawStatCard, drawTableHeader, drawHeaderBrand, stampFooters,
// sanitizeFilename, MARGIN/CONTENT_WIDTH/colors, etc.) stays real, so these
// tests exercise the actual layout code, not a reimplementation of it.
const FAKE_BRANDING: TenantBranding = {
  logo: null,
  hasOwnLogo: false,
  name: 'Sample Institution',
  motto: null,
  showMotto: false,
  headerColor: { r: 79, g: 70, b: 229 },
  website: null,
  addressLine: '12 Test Road, Test City',
  contactLine: null,
  showContactDetails: false,
  includeAddressInFooter: false,
  organizationType: 'Coaching Institute',
  signatureImage: null,
  signatoryName: null,
  signatoryDesignation: null,
  registrationNumber: null,
  establishedYear: null,
  showLogoOnReports: true,
  showPageNumbers: true,
  showQrCodeForVerification: false,
};

vi.mock('./pdfReportKit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pdfReportKit')>();
  return {
    ...actual,
    loadTenantBranding: vi.fn(async () => FAKE_BRANDING),
  };
});

// jsPDF's plugin system attaches every API method (addPage/text/save/...) as
// an OWN property of each instance, not on jsPDF.prototype - vi.spyOn(proto)
// can't see them. Instead, wrap the real class so each `new jsPDF(...)` call
// inside generateResultPdf.ts gets its normal, fully-working instance, with
// addPage/text turned into trackable vi.fn() passthroughs and save() turned
// into a harmless no-op (jsdom has no real download mechanism for it to
// drive) - then the test reads the spies off `lastJsPdfInstance`.
let lastJsPdfInstance: { addPage: ReturnType<typeof vi.fn>; text: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  class TestableJsPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalAddPage: any = this.addPage.bind(this);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalText: any = this.text.bind(this);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).addPage = vi.fn((...a: unknown[]) => originalAddPage(...a));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).text = vi.fn((...a: unknown[]) => originalText(...a));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).save = vi.fn(() => this);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lastJsPdfInstance = this as any;
    }
  }
  return { ...actual, jsPDF: TestableJsPDF };
});

function makeAttempt(
  overrides: Partial<AdminAttemptResultResponse> & Pick<AdminAttemptResultResponse, 'userId' | 'totalScore' | 'passed'>,
): AdminAttemptResultResponse {
  return {
    attemptId: `attempt-${overrides.userId}`,
    examId: 'exam-1',
    examTitle: 'Sample Exam',
    totalMarks: 50,
    passingMarks: 20,
    submittedAtUtc: new Date('2026-01-01T10:00:00Z').toISOString(),
    questions: [],
    hasPendingGrading: false,
    fullscreenExitCount: 0,
    noFaceDetectedCount: 0,
    multipleFacesDetectedCount: 0,
    tabSwitchCount: 0,
    multipleTabsCount: 0,
    copyPasteCount: 0,
    rightClickCount: 0,
    multipleMonitorsCount: 0,
    correctCount: 4,
    incorrectCount: 1,
    skippedCount: 0,
    accuracy: 80,
    rank: null,
    percentile: null,
    totalParticipants: null,
    ...overrides,
  };
}

function makeEntries(enabledResultFields?: string[]): ExamResultBookletEntry[] {
  return [
    {
      result: makeAttempt({ userId: 'u1', totalScore: 46, passed: true }),
      context: { studentName: 'Priya Sharma', rollNumber: 'ROLL-001', examCode: 'EX-1', examType: 'Assessment Exam', durationMinutes: 60, enabledResultFields },
    },
    {
      result: makeAttempt({ userId: 'u2', totalScore: 41, passed: true }),
      context: { studentName: 'John Doe', rollNumber: 'ROLL-002', examCode: 'EX-1', examType: 'Assessment Exam', durationMinutes: 60, enabledResultFields },
    },
    {
      result: makeAttempt({ userId: 'u3', totalScore: 18, passed: false }),
      context: { studentName: 'Arjun Mehta', rollNumber: 'ROLL-003', examCode: 'EX-1', examType: 'Assessment Exam', durationMinutes: 60, enabledResultFields },
    },
  ];
}

/** Flattens every string jsPDF's `.text()` was called with across the whole spy history (each call's first arg can be a string or a wrapped string[]) into one array, so assertions can just check "was this text drawn anywhere". */
function allDrawnText(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls.flatMap((call: unknown[]) => {
    const value = call[0];
    return Array.isArray(value) ? value : [String(value)];
  });
}

describe('computeExamResultSummary', () => {
  it('counts passed/failed and rounds the pass rate', () => {
    const summary = computeExamResultSummary([{ result: { passed: true } }, { result: { passed: true } }, { result: { passed: false } }]);
    expect(summary).toEqual({ total: 3, passed: 2, failed: 1, passRate: 67 });
  });

  it('is an exam-level aggregate, not a single student figure - it changes as more attempts are added', () => {
    const one = computeExamResultSummary([{ result: { passed: true } }]);
    const three = computeExamResultSummary([{ result: { passed: true } }, { result: { passed: true } }, { result: { passed: false } }]);
    expect(one.total).toBe(1);
    expect(three.total).toBe(3);
    expect(three.passRate).not.toBe(one.passRate);
  });

  it('handles a 100% pass rate and a 0% pass rate', () => {
    expect(computeExamResultSummary([{ result: { passed: true } }, { result: { passed: true } }])).toEqual({
      total: 2,
      passed: 2,
      failed: 0,
      passRate: 100,
    });
    expect(computeExamResultSummary([{ result: { passed: false } }])).toEqual({ total: 1, passed: 0, failed: 1, passRate: 0 });
  });

  it('handles no attempts at all without dividing by zero', () => {
    expect(computeExamResultSummary([])).toEqual({ total: 0, passed: 0, failed: 0, passRate: 0 });
  });
});

describe('generateExamResultsBooklet (Exam Result is a roster, not a repeated Student Result page)', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastJsPdfInstance = undefined as any;
  });

  it('draws a single exam-level roster page for a small class, not one page (or more) per student', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries());
    // The old behavior called addPage() for every student after the first
    // (and twice per student in the richer non-"academic" layout) - 3
    // students would have forced at least 2 extra pages. A roster with 3
    // short rows fits on the single page jsPDF starts with.
    expect(lastJsPdfInstance.addPage).not.toHaveBeenCalled();
  });

  it('saves under the expected exam-scoped filename', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries());
    expect(lastJsPdfInstance.save).toHaveBeenCalledWith('Sample-Exam-all-results.pdf');
  });

  it('contains exam-level info and every candidate, and is titled as an exam-level document', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries());
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('EXAM RESULT');
    expect(drawn).toContain('Priya Sharma');
    expect(drawn).toContain('John Doe');
    expect(drawn).toContain('Arjun Mehta');
    // Pass/fail must be legible per candidate, not just an aggregate stat.
    expect(drawn.filter((t) => t === 'PASS')).toHaveLength(2);
    expect(drawn.filter((t) => t === 'FAIL')).toHaveLength(1);
  });

  it('is NOT the per-student Student Result template repeated - that document/title never appears here', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries());
    const drawn = allDrawnText(lastJsPdfInstance.text);
    // "OFFICIAL EXAMINATION REPORT" is drawStudentReport/drawAcademicReport's
    // own title (the individual Student Result document) - if this roster
    // ever starts reusing that per-student drawing again, this is the
    // canary that catches it.
    expect(drawn).not.toContain('OFFICIAL EXAMINATION REPORT');
    expect(drawn.filter((t) => t === 'EXAM RESULT')).toHaveLength(1);
  });

  it('respects the tenant Result Fields config - hides Roll No when studentId is disabled, shows it when enabled/unset', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries(['examDate']));
    const hiddenDrawn = allDrawnText(lastJsPdfInstance.text);
    expect(hiddenDrawn).not.toContain('ROLL-001');
    expect(hiddenDrawn).not.toContain('ROLL-002');
    expect(hiddenDrawn).not.toContain('ROLL-003');

    await generateExamResultsBooklet('Sample Exam', makeEntries());
    const shownDrawn = allDrawnText(lastJsPdfInstance.text);
    expect(shownDrawn).toContain('ROLL-001');
  });

  /**
   * The stat card's label and its value are two separate, immediately-
   * adjacent doc.text() calls (see drawStatCard) - finds the label and
   * returns what was drawn right after it, plus the index to resume
   * searching from. A narrow 6-up card wraps a multi-word label like
   * "Total Candidates" or "Not Submitted" onto its own lines (each becoming
   * a separate array entry once flattened), so this searches for the
   * label's last word - unaffected by wrapping, since a wrap only ever
   * breaks at a word boundary and the last word is always on the final
   * line. Takes a `fromIndex` (and returns the next one) rather than always
   * searching from the start, since "Submitted" and "Not Submitted" share
   * the same last word - searching strictly forward through the known draw
   * order (Total Candidates, Submitted, Passed, Failed, Not Submitted, Pass
   * Rate) is what keeps those two from colliding.
   */
  function statCardValue(drawn: string[], label: string, fromIndex = 0): { value: string; nextIndex: number } {
    const lastWord = label.split(' ').pop()!;
    const labelIndex = drawn.indexOf(lastWord, fromIndex);
    return { value: drawn[labelIndex + 1], nextIndex: labelIndex + 2 };
  }

  it('shows Submitted/Not Submitted/Total Candidates exactly as given by the caller-supplied roster attendance (trusts it verbatim, does not recompute)', async () => {
    // submittedCount deliberately doesn't match entries.length (3) - proves
    // the stat card reads attendance.submittedCount, not its own count of
    // `entries`, now that computeExamAttendance (advanceExamReport.ts) is
    // the sole place this app computes it.
    await generateExamResultsBooklet('Sample Exam', makeEntries(), { totalCandidates: 5, submittedCount: 3, notSubmittedCount: 2 });
    const drawn = allDrawnText(lastJsPdfInstance.text);
    let r = statCardValue(drawn, 'Total Candidates');
    expect(r.value).toBe('5');
    r = statCardValue(drawn, 'Submitted', r.nextIndex);
    expect(r.value).toBe('3');
    r = statCardValue(drawn, 'Not Submitted', r.nextIndex);
    expect(r.value).toBe('2');
  });

  it('falls back to a unique-candidate count for Submitted (not raw attempt rows) when the caller has no roster data (eg. the settings-page sample) - a retake produces two entries for the same userId', async () => {
    const entries = makeEntries();
    // A 4th entry that's a second attempt by the same student as entries[0]
    // (same userId, different attemptId/score) - GetExamReportHandler.cs
    // returns one row per attempt, so this is a real shape the fallback
    // default has to handle, not a contrived one.
    entries.push({
      result: makeAttempt({ userId: entries[0].result.userId, attemptId: 'attempt-u1-retake', totalScore: 30, passed: false }),
      context: entries[0].context,
    });
    await generateExamResultsBooklet('Sample Exam', entries); // no attendance -> fallback default
    const drawn = allDrawnText(lastJsPdfInstance.text);
    // 3 unique students submitted (u1 twice, u2, u3) - not 4 entries.
    let r = statCardValue(drawn, 'Total Candidates');
    expect(r.value).toBe('3');
    r = statCardValue(drawn, 'Submitted', r.nextIndex);
    expect(r.value).toBe('3');
    r = statCardValue(drawn, 'Not Submitted', r.nextIndex);
    expect(r.value).toBe('0');
  });

  it('shows the exam date, gated by Result Fields the same way Roll No is', async () => {
    await generateExamResultsBooklet('Sample Exam', makeEntries());
    const shownDrawn = allDrawnText(lastJsPdfInstance.text);
    expect(shownDrawn).toContain('Exam Date');
    const examDateLabelIndex = shownDrawn.indexOf('Exam Date');
    expect(shownDrawn[examDateLabelIndex + 1]).not.toBe('—');

    // 'examDate' left out of the enabled list -> gated off, same "—" fallback a disabled Roll No gets.
    await generateExamResultsBooklet('Sample Exam', makeEntries(['studentId']));
    const hiddenDrawn = allDrawnText(lastJsPdfInstance.text);
    const hiddenLabelIndex = hiddenDrawn.indexOf('Exam Date');
    expect(hiddenDrawn[hiddenLabelIndex + 1]).toBe('—');
  });
});

describe('Student Result - "Student & Academic Information" section (Roll No., PRN/Registration No., Enrollment No., Program, Department, Year of Study, Semester, Division/Class, Academic Year)', () => {
  it('always draws the section (Student Name, Roll No.) even with no academic data at all', async () => {
    await generateResultPdf(makeAttempt({ userId: 'u1', totalScore: 45, passed: true }), {
      studentName: 'Priya Sharma',
      rollNumber: 'ROLL-001',
    });
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('Student & Academic Information');
    expect(drawn).toContain('Roll No.');
    expect(drawn).toContain('ROLL-001');
  });

  it('draws Roll No., PRN/Registration No., Enrollment No., Program and every populated academic field with its real value, "Year" relabeled "Year of Study", Course omitted (redundant with Program)', async () => {
    // College/University's own catalog (Department/Semester/Division/etc.) -
    // Coaching Institute's fixed FAKE_BRANDING only recognizes batch/course/
    // academicYear, so this test needs a realistic College/University tenant.
    vi.mocked(loadTenantBranding).mockResolvedValueOnce({ ...FAKE_BRANDING, organizationType: 'University' });
    await generateResultPdf(makeAttempt({ userId: 'u1', totalScore: 45, passed: true }), {
      studentName: 'Priya Sharma',
      rollNumber: 'ROLL-001',
      program: 'B.Tech Computer Engineering',
      academicFields: {
        program: 'B.Tech Computer Engineering',
        course: 'B.Tech Computer Engineering',
        prn: 'PRN2026001',
        enrollmentNo: 'ENR2026001',
        department: 'Computer Engineering',
        semester: '6',
        year: '3',
        division: 'A',
        academicYear: '2026-27',
      },
    });
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('Student & Academic Information');
    expect(drawn).toContain('Roll No.');
    expect(drawn).toContain('PRN / Registration No.');
    expect(drawn).toContain('PRN2026001');
    expect(drawn).toContain('Enrollment No.');
    expect(drawn).toContain('ENR2026001');
    expect(drawn).toContain('Program');
    expect(drawn).toContain('B.Tech Computer Engineering');
    expect(drawn).toContain('Department');
    expect(drawn).toContain('Computer Engineering');
    expect(drawn).toContain('Year of Study');
    expect(drawn).not.toContain('Year');
    expect(drawn).toContain('Semester');
    expect(drawn).toContain('Division / Class');
    expect(drawn).toContain('Academic Year');
    expect(drawn).toContain('2026-27');
    // Course is redundant with Program for College/University - must not
    // appear as its own row (its value is identical to Program's here, so
    // this only proves the label is gone, not the value).
    expect(drawn).not.toContain('Course');
  });

  it('respects Result Fields - PRN/Enrollment No./Department/etc. hidden when the tenant has turned off "academicDetails", Roll No. and Program stay (they had their own always-on field before that toggle existed)', async () => {
    const context = {
      studentName: 'Priya Sharma',
      rollNumber: 'ROLL-001',
      program: 'B.Tech Computer Engineering',
      academicFields: { department: 'Computer Engineering', prn: 'PRN2026001' },
    };
    vi.mocked(loadTenantBranding).mockResolvedValueOnce({ ...FAKE_BRANDING, organizationType: 'University' });
    await generateResultPdf(makeAttempt({ userId: 'u1', totalScore: 45, passed: true }), {
      ...context,
      enabledResultFields: ['studentId'], // academicDetails left out -> gated off
    });
    const hiddenDrawn = allDrawnText(lastJsPdfInstance.text);
    expect(hiddenDrawn).toContain('Roll No.');
    expect(hiddenDrawn).toContain('Program');
    expect(hiddenDrawn).not.toContain('Department');
    expect(hiddenDrawn).not.toContain('PRN / Registration No.');

    vi.mocked(loadTenantBranding).mockResolvedValueOnce({ ...FAKE_BRANDING, organizationType: 'University' });
    await generateResultPdf(makeAttempt({ userId: 'u1', totalScore: 45, passed: true }), {
      ...context,
      enabledResultFields: ['studentId', 'academicDetails'],
    });
    const shownDrawn = allDrawnText(lastJsPdfInstance.text);
    expect(shownDrawn).toContain('Department');
    expect(shownDrawn).toContain('PRN / Registration No.');
  });

  it('omits Program entirely (not even as "—") for an Organization Type with no Program concept at all, eg. Coaching Institute', async () => {
    // FAKE_BRANDING already defaults to 'Coaching Institute'.
    await generateResultPdf(makeAttempt({ userId: 'u1', totalScore: 45, passed: true }), {
      studentName: 'Priya Sharma',
      rollNumber: 'ROLL-001',
    });
    expect(allDrawnText(lastJsPdfInstance.text)).not.toContain('Program');
  });
});
