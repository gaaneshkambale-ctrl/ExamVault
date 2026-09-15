import { describe, expect, it, vi, beforeEach } from 'vitest';
import { computeExamResultSummary, generateExamResultsBooklet } from './generateResultPdf';
import type { ExamResultBookletEntry } from './generateResultPdf';
import type { AdminAttemptResultResponse } from '../types/result';
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
});
