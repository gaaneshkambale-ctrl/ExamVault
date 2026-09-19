import { describe, expect, it, vi, beforeEach } from 'vitest';
import { exportAdvanceExamReportPdf } from './exportAdvanceExamReportPdf';
import { getExamResultScheme } from './examResultScheme';
import type { AdvanceReportData, AdvanceReportStudentRow, DistributionBucket } from './advanceExamReport';
import type { AdvanceReportExtras, QuestionDifficultyStat, SectionPerformanceStat } from './advanceExamReportAnalysis';
import type { AdminAttemptResultResponse } from '../types/result';
import type { UserListItem } from '../types/user';
import type { ExamResponse } from '../types/exam';
import type { TenantBranding } from './pdfReportKit';

// Only loadTenantBranding is overridden - every drawing helper (panel,
// fieldRow, drawStatCard, drawCenteredBrandHeader, stampFooters,
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
  return { ...actual, loadTenantBranding: vi.fn(async () => FAKE_BRANDING) };
});

// jsPDF's plugin system attaches every API method (addPage/text/save/...) as
// an OWN property of each instance, not on jsPDF.prototype - vi.spyOn(proto)
// can't see them. Instead, wrap the real class so each `new jsPDF(...)` call
// inside exportAdvanceExamReportPdf.ts gets its normal, fully-working
// instance, with text turned into a trackable vi.fn() passthrough and
// save() turned into a harmless no-op (jsdom has no real download mechanism
// to drive) - then the test reads the spy off `lastJsPdfInstance`.
let lastJsPdfInstance: { text: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  class TestableJsPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalText: any = this.text.bind(this);
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

/** Flattens every string jsPDF's `.text()` was called with across the whole spy history (each call's first arg can be a string or a wrapped string[]) into one array, so assertions can just check "was this text drawn anywhere". */
function allDrawnText(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls.flatMap((call: unknown[]) => {
    const value = call[0];
    return Array.isArray(value) ? value : [String(value)];
  });
}

const EXAM: ExamResponse = {
  id: 'exam-1',
  title: 'C# Programming - Final Assessment',
  examCode: 'EX-1',
  description: '',
  category: 'Programming',
  containsSections: false,
  creationMethod: 'Manual',
  durationMinutes: 60,
  totalMarks: 50,
  passingMarks: 20,
  instructions: '',
  examTypeId: null,
  tags: '',
  academicFields: null,
  restrictToAcademicScope: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  showResult: true,
  showCorrectAnswers: true,
  allowReview: true,
  startAtUtc: null,
  endAtUtc: null,
  maxAttempts: 1,
  negativeMarkingEnabled: false,
  negativeMarks: 0,
  showSectionSummaryToStudents: true,
  allowCalculator: false,
  allowNotes: false,
  autoSubmitOnTimeEnd: true,
  confirmBeforeSubmit: true,
  status: 'Published',
  totalQuestions: 5,
  createdOn: new Date().toISOString(),
  examTypeName: 'Assessment Exam',
  tenantId: 'tenant-1',
  createdByUserId: 'admin-1',
  createdByName: 'Test Admin',
  certificateEnabled: false,
  minimumCertificateScorePercent: 80,
};

const SCHEME = getExamResultScheme(EXAM.examTypeName ?? undefined);

function makeUser(overrides: Pick<UserListItem, 'id' | 'fullName' | 'email' | 'rollNumber'>): UserListItem {
  return {
    role: 'Student',
    createdAtUtc: new Date().toISOString(),
    isActive: true,
    phoneNumber: null,
    hasPhoto: false,
    tenantId: 'tenant-1',
    lastLoginAtUtc: null,
    createdByUserId: null,
    createdByName: null,
    academicFields: null,
    ...overrides,
  };
}

function makeAttempt(overrides: Partial<AdminAttemptResultResponse> & Pick<AdminAttemptResultResponse, 'attemptId' | 'userId' | 'totalScore' | 'passed'>): AdminAttemptResultResponse {
  return {
    examId: EXAM.id,
    examTitle: EXAM.title,
    totalMarks: 50,
    passingMarks: 20,
    submittedAtUtc: new Date().toISOString(),
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

const EXTRA_SECTION_STATS: SectionPerformanceStat[] = [{ sectionId: 's1', sectionName: 'General', totalQuestions: 2, avgScore: 1.8, accuracy: 90 }];

/** A single present-and-passed candidate, nobody absent - the real "1 real student" shape that prompted this fix (Greenfield University's own tenant data). */
function makeSingleCandidateReport(): AdvanceReportData {
  const user = makeUser({ id: 'u1', fullName: 'Arjun Mehta', email: 'arjun@example.com', rollNumber: 'GU001' });
  const attempt = makeAttempt({ attemptId: 'a1', userId: 'u1', totalScore: 50, passed: true, correctCount: 5, incorrectCount: 0, accuracy: 100 });
  const row: AdvanceReportStudentRow = { student: user, attempt, percent: 100, rank: null, percentile: null };
  const distribution: DistributionBucket[] = [
    { label: '0-20%', count: 0 },
    { label: '21-40%', count: 0 },
    { label: '41-60%', count: 0 },
    { label: '61-80%', count: 0 },
    { label: '81-100%', count: 1 },
  ];
  return {
    totalCandidates: 1,
    presentCount: 1,
    absentCount: 0,
    absentStudents: [],
    studentRows: [row],
    averagePercentage: 100,
    highest: row,
    lowest: row,
    passCount: 1,
    passRate: 100,
    distribution,
    mostCommonBucket: distribution[4],
  };
}

/** 5 candidates (right at MIN_SAMPLE_SIZE), all attempted - big enough for the report's normal, non-caveated analytics language. */
function makeFiveCandidateReport(): AdvanceReportData {
  const rows: AdvanceReportStudentRow[] = Array.from({ length: 5 }, (_, i) => {
    const passed = i < 4;
    const score = passed ? 40 : 10;
    const user = makeUser({ id: `u${i}`, fullName: `Student ${i}`, email: `student${i}@example.com`, rollNumber: `R00${i}` });
    const attempt = makeAttempt({ attemptId: `a${i}`, userId: `u${i}`, totalScore: score, passed });
    return { student: user, attempt, percent: (score / 50) * 100, rank: null, percentile: null };
  });
  const distribution: DistributionBucket[] = [
    { label: '0-20%', count: 1 },
    { label: '21-40%', count: 0 },
    { label: '41-60%', count: 0 },
    { label: '61-80%', count: 4 },
    { label: '81-100%', count: 0 },
  ];
  return {
    totalCandidates: 5,
    presentCount: 5,
    absentCount: 0,
    absentStudents: [],
    studentRows: rows,
    averagePercentage: 68,
    highest: rows[0],
    lowest: rows[4],
    passCount: 4,
    passRate: 80,
    distribution,
    mostCommonBucket: distribution[3],
  };
}

function makeExtras(questionDifficulty: QuestionDifficultyStat[]): AdvanceReportExtras {
  return { sectionStats: EXTRA_SECTION_STATS, questionDifficulty };
}

describe('exportAdvanceExamReportPdf - question performance labeling', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastJsPdfInstance = undefined as any;
  });

  // Short question text, well inside the panel's fitText truncation width -
  // an assertion for exact text that got silently ellipsis-truncated would
  // give false confidence, so these stay short enough to never hit that.
  it('never calls a 100%-correct question "difficult" - the old panel title is gone', async () => {
    const extras = makeExtras([{ questionId: 'q1', questionText: 'Exception keyword?', correct: 5, attempts: 5, percentCorrect: 100 }]);
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeSingleCandidateReport(), extras);
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).not.toContain('Most Difficult Questions');
    expect(drawn).toContain('Lowest Performing Questions');
    // The 100%-correct question is excluded outright, not listed under a
    // "difficult" framing next to its own 100%.
    expect(drawn).not.toContain('Exception keyword?');
    expect(drawn).toContain('Every question was answered correctly by every candidate.');
  });

  it('lists a genuinely low-performing question but still excludes a 100%-correct one alongside it', async () => {
    const extras = makeExtras([
      { questionId: 'q1', questionText: 'LINQ query output?', correct: 1, attempts: 5, percentCorrect: 33 },
      { questionId: 'q2', questionText: 'Exception keyword?', correct: 5, attempts: 5, percentCorrect: 100 },
    ]);
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeFiveCandidateReport(), extras);
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('Lowest Performing Questions');
    expect(drawn).toContain('LINQ query output?');
    expect(drawn).not.toContain('Exception keyword?');
  });
});

describe('exportAdvanceExamReportPdf - small-sample honesty', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastJsPdfInstance = undefined as any;
  });

  it('shows a limited-sample banner and a softened recommendation for a single-candidate exam, not a strong difficulty claim', async () => {
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeSingleCandidateReport(), makeExtras([]));
    const drawn = allDrawnText(lastJsPdfInstance.text).join(' ');
    expect(drawn).toContain('Limited sample - only 1 candidate(s) submitted');
    expect(drawn).toContain('Only 1 candidate(s) submitted this exam - treat the pass rate and difficulty as indicative only');
    // The old branch this replaces for a 100% pass rate - must not appear
    // when the "100%" is really just one person's result.
    expect(drawn).not.toContain('Strong pass rate (100%) - consider raising difficulty for future assessments.');
  });

  it('shows neither the banner nor the small-sample caveat once there are enough candidates', async () => {
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeFiveCandidateReport(), makeExtras([]));
    const drawn = allDrawnText(lastJsPdfInstance.text).join(' ');
    expect(drawn).not.toContain('Limited sample');
    expect(drawn).not.toContain('treat the pass rate and difficulty as indicative only');
  });
});

describe('exportAdvanceExamReportPdf - header', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastJsPdfInstance = undefined as any;
  });

  it('uses the same centered letterhead header as the other two report types, and only prints "Generated On" once per page (the footer already has it)', async () => {
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeSingleCandidateReport(), makeExtras([]));
    const drawn = allDrawnText(lastJsPdfInstance.text);
    // drawCenteredBrandHeader centers the institution name - a real, non-
    // fallback name here (not "ExamVault") is the signal this ran, since
    // the old right-aligned header never printed the tenant name at all
    // when hasOwnLogo was false (see the header's own comment).
    expect(drawn).toContain('Sample Institution');
    expect(drawn.filter((t) => typeof t === 'string' && t.startsWith('Generated on:')).length).toBe(2); // once per page, footer only
    expect(drawn.filter((t) => typeof t === 'string' && t.startsWith('Generated On:')).length).toBe(0); // header's copy is off
  });
});

describe('exportAdvanceExamReportPdf - Submitted/Not Submitted terminology', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastJsPdfInstance = undefined as any;
  });

  it('uses "Submitted"/"Not Submitted" throughout (stat cards, Submission Split, Submission Overview, student table), never "Attempted"/"Present"/"Absent"/"Attendance" - the reporting data is submitted-only and cannot support those stronger claims', async () => {
    await exportAdvanceExamReportPdf(EXAM, SCHEME, makeFiveCandidateReport(), makeExtras([]));
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('Submitted');
    expect(drawn).toContain('Not Submitted');
    expect(drawn).not.toContain('Attempted');
    expect(drawn).not.toContain('Present');
    expect(drawn).not.toContain('Absent');
    expect(drawn.join(' ')).not.toContain('Attendance');
  });

  it('also uses "Submitted"/"Not Submitted" for the no-pass-fail-concept (4-up) stat card layout', async () => {
    const noPassFailScheme = { ...SCHEME, hasPassFailConcept: false };
    await exportAdvanceExamReportPdf(EXAM, noPassFailScheme, makeFiveCandidateReport(), makeExtras([]));
    const drawn = allDrawnText(lastJsPdfInstance.text);
    expect(drawn).toContain('Submitted');
    expect(drawn).toContain('Not Submitted');
    expect(drawn).not.toContain('Attempted');
    expect(drawn).not.toContain('Present');
    expect(drawn).not.toContain('Absent');
  });
});
