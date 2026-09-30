import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { getGrade } from '../types/result';
import type { AdminAttemptResultResponse, ResultSummaryResponse } from '../types/result';
import {
  AMBER,
  BORDER,
  BRAND,
  CONTENT_WIDTH,
  GRAY,
  GREEN,
  MARGIN,
  PAGE_WIDTH,
  RED,
  TEXT_DARK,
  TEXT_MUTED,
  drawBadge,
  drawCenteredBrandHeader,
  drawHeaderBrand,
  drawStatCard,
  drawTableHeader,
  ensurePageSpace,
  fieldRow,
  loadTenantBranding,
  panel,
  panelTitle,
  sanitizeFilename,
  setColor,
  stampFooters,
} from './pdfReportKit';
import type { TenantBranding } from './pdfReportKit';
import type { ExamAttendance } from './advanceExamReport';
import { getResultPdfVariant, RESULT_PDF_VARIANT_COPY } from './resultPdfVariants';
import { getPopulatedStudentAcademicFields, getRollNumberLabelForType, getStudentFieldsForType, isResultFieldVisible } from '../constants/organizationTypeFieldCatalog';

export interface ResultPdfSectionStat {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxScore: number;
}

export interface ResultPdfContext {
  studentName?: string;
  studentEmail?: string;
  rollNumber?: string | null;
  /** Student's academic-field "Program" (eg. "B.Tech Computer Engineering") - only used by the compact 'academic' variant's Registration/Program info block. Null/undefined shows "—", same fallback as every other optional field here. */
  program?: string | null;
  /**
   * The student's full academicFields dict (Department, Semester, Division/
   * Class, Enrollment No., Course, Year, Academic Year, etc. - whichever
   * this Organization Type actually collects, see STUDENT_FIELDS_BY_TYPE).
   * Drives the "Academic Details" panel via getPopulatedStudentAcademicFields
   * - only fields the student genuinely has a value for are drawn, and the
   * whole panel is omitted for a student/org type with nothing set. Gated
   * by the same Result Fields mechanism as everything else here, under the
   * 'academicDetails' key.
   */
  academicFields?: Record<string, string> | null;
  examCode?: string | null;
  examType?: string | null;
  durationMinutes?: number;
  attemptStartedAtUtc?: string | null;
  integrityScorePercent?: number;
  /** Per-section breakdown. Omit when the caller hasn't loaded section data - the report falls back to a single "Overall" row rather than fabricate a split. */
  sectionStats?: ResultPdfSectionStat[];
  /** Average accuracy % across every student's attempt on this exam. Omit (rather than guess) when the caller doesn't have every attempt loaded - e.g. the student's own "My Result" page can't see other students' results. */
  averageAccuracyPercent?: number;
  /** This student's 1-based rank by score among everyone who attempted this exam, and the total attempt count it was ranked against. Omit together when not available. */
  rank?: number;
  totalParticipants?: number;
  /**
   * The tenant's admin-configured Result Fields (Organization Settings ->
   * Academic Configuration -> Result Fields), keyed the same way as
   * RESULT_FIELD_CATALOG in organizationTypeFieldCatalog.ts. Omit (or pass
   * an empty array) when the tenant hasn't configured this yet - every
   * optional section below then falls back to always showing, exactly like
   * before this field existed, so an unconfigured tenant sees no change.
   * Only once an admin actively saves a selection does this start hiding
   * sections. Gated fields: studentId (Roll/Registration No.), examDate,
   * duration, rank, percentile, accuracy, remarks. studentName/examName/
   * marks/percentage/grade/result always show (not in RESULT_FIELD_CATALOG
   * at all - see its own comment).
   * Every other catalog key is `comingSoon: true` - no per-attempt data
   * exists to gate yet (module score, competency, aptitude breakdown,
   * etc.), so there's nothing here for them to key off.
   */
  enabledResultFields?: string[];
}

function isResultFieldEnabled(context: ResultPdfContext, branding: TenantBranding, key: string): boolean {
  return isResultFieldVisible(branding.organizationType, context.enabledResultFields, key);
}

/**
 * Draws a titled panel of label/value rows in a 2-column grid, sized to
 * however many rows there actually are. Draws nothing and returns `y`
 * unchanged when there are no fields.
 */
function drawInfoGridPanel(doc: jsPDF, y: number, title: string, fields: { label: string; value: string }[]): number {
  if (fields.length === 0) return y;

  const cols = 2;
  const rows = Math.ceil(fields.length / cols);
  const rowH = 7;
  const panelH = 10 + rows * rowH;
  const panelY = ensurePageSpace(doc, y, panelH + 8);
  panel(doc, MARGIN, panelY, CONTENT_WIDTH, panelH);
  panelTitle(doc, title, MARGIN + 4, panelY + 7);
  const colW = CONTENT_WIDTH / cols;
  fields.forEach((field, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    fieldRow(doc, field.label, field.value, MARGIN + 4 + col * colW, panelY + 14 + row * rowH, 32, colW - 8);
  });
  return panelY + panelH + 8;
}

/**
 * The "Student & Academic Information" section's fields, in a fixed order:
 * Student Name and Roll No. always come first (Roll No. gated by the
 * 'studentId' Result Field, same as before this section existed); PRN/
 * Registration No. and Enrollment No. come right after, so all 3 identity-
 * ish fields sit together, followed by Program (unconditional - it had its
 * own always-shown field before 'academicDetails' existed, so turning that
 * toggle off must not make Program disappear too); then Department, Year
 * of Study, Semester, Division/Class, Academic Year (and anything else
 * this Organization Type's own catalog defines), all gated by
 * 'academicDetails' together - see getPopulatedStudentAcademicFields.
 */
function buildStudentAcademicInfoFields(context: ResultPdfContext, branding: TenantBranding): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [{ label: 'Student Name', value: context.studentName ?? 'Unknown Student' }];
  if (isResultFieldEnabled(context, branding, 'studentId')) {
    fields.push({ label: getRollNumberLabelForType(branding.organizationType), value: context.rollNumber ?? '—' });
  }
  if (isResultFieldEnabled(context, branding, 'academicDetails')) {
    if (context.academicFields?.prn) {
      fields.push({ label: 'PRN / Registration No.', value: context.academicFields.prn });
    }
    if (context.academicFields?.enrollmentNo) {
      fields.push({ label: 'Enrollment No.', value: context.academicFields.enrollmentNo });
    }
  }
  // Shown (with a "—" fallback, like every other always-on field here) only
  // for an Organization Type that actually has a Program concept at all -
  // omitted entirely for one that doesn't (eg. a Coaching Institute), same
  // as every other academic field below.
  if (getStudentFieldsForType(branding.organizationType).some((field) => field.key === 'program')) {
    fields.push({ label: 'Program', value: context.program ?? '—' });
  }
  if (isResultFieldEnabled(context, branding, 'academicDetails')) {
    fields.push(...getPopulatedStudentAcademicFields(branding.organizationType, context.academicFields));
  }
  return fields;
}

export function isSkipped(q: { selectedOptionId: string | null; selectedOptionIds: string[] | null; answerText: string | null }): boolean {
  return q.selectedOptionId === null && (!q.selectedOptionIds || q.selectedOptionIds.length === 0) && !q.answerText;
}

// AttemptScorer.cs hardcodes IsCorrect = false for every CodeProgram question (there's
// no auto-scoring engine - an admin assigns MarksAwarded by hand), so a fully-credited
// code/SQL answer would otherwise show as "Incorrect" everywhere in this report. isCorrect
// stays authoritative for MCQ/MultiSelect, where the backend does compute it properly.
export function isQuestionCorrect(q: { questionType: string; marks: number; marksAwarded: number; isPendingGrading: boolean; isCorrect: boolean }): boolean {
  if (q.questionType === 'CodeProgram') {
    return !q.isPendingGrading && q.marks > 0 && q.marksAwarded >= q.marks;
  }
  return q.isCorrect;
}

/**
 * Compact single-page "Official Examination Report" - built to match a
 * specific university-transcript-style report the user asked for directly.
 * Used for every Organization Type's student result PDF (previously only
 * College/University/School, with a separate richer multi-panel dashboard
 * layout for every other type - that second layout, drawStudentReport, was
 * removed at the user's explicit request in favor of this one compact
 * layout everywhere; only the copy/tone still varies per type, via
 * RESULT_PDF_VARIANT_COPY/resultPdfVariants.ts). Subject-wise marks read
 * `sections` (context.sectionStats, falling back to a single "Overall" row).
 */
function drawAcademicReport(
  doc: jsPDF,
  result: AdminAttemptResultResponse | ResultSummaryResponse,
  context: ResultPdfContext,
  branding: TenantBranding,
  isFirstInDocument: boolean,
  qrDataUrl: string | null = null,
): void {
  if (!isFirstInDocument) {
    doc.addPage();
  }
  const variantCopy = RESULT_PDF_VARIANT_COPY[getResultPdfVariant(branding.organizationType)];

  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
  const correctCount = result.correctCount;
  const incorrectCount = result.incorrectCount;
  const skippedCount = result.skippedCount;
  const totalQuestions = correctCount + incorrectCount + skippedCount;

  const sections: ResultPdfSectionStat[] =
    context.sectionStats && context.sectionStats.length > 0
      ? context.sectionStats
      : [
          {
            name: 'Overall',
            total: totalQuestions,
            correct: correctCount,
            incorrect: incorrectCount,
            skipped: skippedCount,
            score: result.totalScore,
            maxScore: result.totalMarks,
          },
        ];

  let y = MARGIN;

  // Header: small logo top-left, "Generated On" top-right, and the
  // institution name/tagline/address block CENTERED across the page -
  // matching the reference "St. Xavier's University" mockup exactly,
  // rather than the rich dashboard layout's left-aligned-next-to-logo
  // convention. Shown regardless of hasOwnLogo (unlike that other layout) -
  // a centered institution name never looks redundant next to a small
  // corner logo the way it would sitting immediately beside it.
  const logoH = 10;
  drawHeaderBrand(doc, MARGIN, y, logoH, branding.logo, branding.showLogoOnReports);
  // No separate "Generated On" here - the footer (stampFooters/drawFooter)
  // already prints "Generated on" with full date+time and a page number on
  // every page, so the header doesn't repeat the same timestamp (same
  // dedup already applied to Exam Result's and Detailed Exam Report's
  // headers).

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, 'setTextColor', TEXT_DARK);
  const nameLine = branding.establishedYear ? `${branding.name}  (Est. ${branding.establishedYear})` : branding.name;
  doc.text(nameLine, PAGE_WIDTH / 2, y + 5, { align: 'center' });
  let centerY = y + 10;
  if (branding.showMotto && branding.motto) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(branding.motto, PAGE_WIDTH / 2, centerY, { align: 'center' });
    centerY += 4.5;
  }
  // Contact/website respect "Show contact details (phone, email, website)"
  // (Organization Settings -> Reports & Documents) - a real, pre-existing
  // tenant toggle that generateResultPdf.ts's other layout never actually
  // read either (see ActionPlan.txt), but this new header is the one
  // place in this file that prints contact info at all, so it's the one
  // that needs to respect it.
  const addressParts = [branding.addressLine, ...(branding.showContactDetails ? [branding.contactLine, branding.website] : [])].filter(
    (part): part is string => Boolean(part),
  );
  if (addressParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(addressParts.join('  |  '), PAGE_WIDTH / 2, centerY, { align: 'center' });
    centerY += 4;
  }
  if (branding.registrationNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(`Reg. No: ${branding.registrationNumber}`, PAGE_WIDTH / 2, centerY, { align: 'center' });
    centerY += 4;
  }
  y = Math.max(y + logoH + 4, centerY + 2);
  setColor(doc, 'setDrawColor', branding.headerColor);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 9;

  // Centered title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(variantCopy.title.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
  y += 9;

  // One "Student & Exam Information" panel - previously two separate titled
  // panels (Student & Academic Information, then Exam Information; before
  // that, one untitled two-column panel put Student/Registration/Program
  // beside Exam/Date/Duration, with academic fields in a further panel
  // below). Merged per a direct request so every student/academic/exam
  // field lives together in one section.
  y = drawInfoGridPanel(doc, y, 'Student & Exam Information', [
    ...buildStudentAcademicInfoFields(context, branding),
    { label: 'Exam Name', value: result.examTitle },
    {
      label: 'Exam Date',
      value: isResultFieldEnabled(context, branding, 'examDate') ? new Date(result.submittedAtUtc).toLocaleDateString() : '—',
    },
    {
      label: 'Duration',
      value: isResultFieldEnabled(context, branding, 'duration') && context.durationMinutes ? `${context.durationMinutes} Minutes` : '—',
    },
  ]);

  // Subject-wise marks table - drawn with a full grid (outer border + row/
  // column rules), matching the bordered-table look of the reference
  // "Official Examination Report" mockup, rather than pdfReportKit's usual
  // background-shading-only tables (drawTableHeader has no border lines by
  // design - left untouched since other reports rely on that plain look).
  const tColW = [12, CONTENT_WIDTH - 12 - 30 - 30, 30, 30];
  const rowH = 7;
  const tableStartY = ensurePageSpace(doc, y, rowH * (sections.length + 2));
  y = tableStartY;
  const tableW = tColW.reduce((a, b) => a + b, 0);
  drawTableHeader(doc, MARGIN, y, tColW, ['Q.No', 'Subject / Section', 'Marks', 'Obtained'], rowH);
  y += rowH;
  let totalMax = 0;
  let totalScore = 0;
  sections.forEach((s, i) => {
    if (i % 2 === 1) {
      setColor(doc, 'setFillColor', { r: 250, g: 250, b: 251 });
      doc.rect(MARGIN, y, tableW, rowH, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(doc, 'setTextColor', TEXT_DARK);
    let cx = MARGIN + 2;
    doc.text(String(i + 1), cx, y + rowH - 2.5);
    cx += tColW[0];
    doc.text(s.name, cx, y + rowH - 2.5);
    cx += tColW[1];
    doc.text(String(s.maxScore), cx, y + rowH - 2.5);
    cx += tColW[2];
    doc.text(String(s.score), cx, y + rowH - 2.5);
    totalMax += s.maxScore;
    totalScore += s.score;
    y += rowH;
  });
  setColor(doc, 'setFillColor', { r: 241, g: 245, b: 249 });
  doc.rect(MARGIN, y, tableW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text('Total Marks', MARGIN + 2 + tColW[0], y + rowH - 2.5);
  doc.text(String(totalMax), MARGIN + 2 + tColW[0] + tColW[1], y + rowH - 2.5);
  doc.text(String(totalScore), MARGIN + 2 + tColW[0] + tColW[1] + tColW[2], y + rowH - 2.5);
  y += rowH;

  // Grid lines: outer border, a rule under every row, and a rule between
  // every column - drawn last so they sit on top of the fills above.
  const tableEndY = y;
  setColor(doc, 'setDrawColor', BORDER);
  doc.setLineWidth(0.25);
  const rowCount = sections.length + 2;
  for (let r = 0; r <= rowCount; r++) {
    const ry = tableStartY + r * rowH;
    doc.line(MARGIN, ry, MARGIN + tableW, ry);
  }
  let colX = MARGIN;
  tColW.forEach((w) => {
    doc.line(colX, tableStartY, colX, tableEndY);
    colX += w;
  });
  doc.line(MARGIN + tableW, tableStartY, MARGIN + tableW, tableEndY);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN, tableStartY, tableW, tableEndY - tableStartY);
  y += 10;

  // Bottom summary row: Percentage / Result / Grade
  y = ensurePageSpace(doc, y, 22);
  const summaryColW = CONTENT_WIDTH / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('Percentage', MARGIN, y);
  doc.text('Result', MARGIN + summaryColW, y);
  doc.text('Grade', MARGIN + summaryColW * 2, y);
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setColor(doc, 'setTextColor', result.passed ? GREEN : RED);
  doc.text(`${percentage}%`, MARGIN, y);
  const statusText = (result.passed ? variantCopy.statusLabel.passed : variantCopy.statusLabel.failed).toUpperCase();
  drawBadge(doc, statusText, MARGIN + summaryColW, y - 6, result.passed ? GREEN : RED, { r: 255, g: 255, b: 255 });
  setColor(doc, 'setTextColor', AMBER);
  doc.text(grade, MARGIN + summaryColW * 2, y);
  y += 16;

  // Sign-off block: Date of Result (left), signature image + name + designation (right)
  y = ensurePageSpace(doc, y, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('Date of Result', MARGIN, y);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(new Date(result.submittedAtUtc).toLocaleDateString(), MARGIN, y + 5);

  const signW = 45;
  const signX = PAGE_WIDTH - MARGIN - signW;
  if (branding.signatureImage) {
    const sigH = 10;
    doc.addImage(branding.signatureImage.dataUrl, 'PNG', signX, y - 10, sigH * branding.signatureImage.ratio, sigH);
  }
  setColor(doc, 'setDrawColor', BORDER);
  doc.setLineWidth(0.3);
  doc.line(signX, y + 2, signX + signW, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setColor(doc, 'setTextColor', TEXT_DARK);
  doc.text(branding.signatoryName ?? 'Authorized Signatory', signX, y + 6);
  if (branding.signatoryDesignation) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(branding.signatoryDesignation, signX, y + 10);
  }
  let signOffBottom = y + 18;
  if (qrDataUrl) {
    const qrSize = 16;
    doc.addImage(qrDataUrl, 'PNG', MARGIN, y + 8, qrSize, qrSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text('Scan to verify this result', MARGIN + qrSize + 3, y + 14);
    signOffBottom = Math.max(signOffBottom, y + 8 + qrSize + 4);
  }
  y = signOffBottom;

  // Closing tagline + disclaimer
  y = ensurePageSpace(doc, y, 14);
  if (branding.showMotto && branding.motto) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(branding.motto, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 6;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  setColor(doc, 'setTextColor', TEXT_MUTED);
  doc.text('This is a computer-generated report and does not require a physical signature.', PAGE_WIDTH / 2, y, { align: 'center' });
}

/** Pass/fail/rate aggregation for the Exam Result roster - exported (pure, no jsPDF dependency) so it's directly unit-testable without mocking a PDF document. */
export function computeExamResultSummary(entries: { result: { passed: boolean } }[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
} {
  const total = entries.length;
  const passed = entries.filter((e) => e.result.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, failed, passRate };
}

/**
 * "Exam Result" - an exam-level roster covering every candidate, answering
 * "how did everyone perform" - NOT the per-student "what was this one
 * student's result" document (that's drawAcademicReport, used by
 * generateResultPdf and, previously, mistakenly repeated N times for this
 * booklet too - see ActionPlan.txt). Deliberately lightweight:
 * exam info + pass/fail/absent counts + one student table, nothing more -
 * score distribution, rank/percentile, section/question analysis and
 * insights stay exclusive to the Detailed Exam Report
 * (exportAdvanceExamReportPdf.ts) so the two documents don't end up the
 * same thing one level up from where Student Result/Exam Result used to
 * collide.
 */
function drawExamResultRoster(
  doc: jsPDF,
  examTitle: string,
  entries: ExamResultBookletEntry[],
  branding: TenantBranding,
  generatedAt: Date,
  attendance: ExamAttendance,
): void {
  // Same letterhead header component Student Result (drawAcademicReport,
  // below) and Detailed Exam Report (exportAdvanceExamReportPdf.ts) use -
  // logo top-left, institution name/motto/address/registration CENTERED,
  // title centered below the rule - replacing this roster's own former
  // right-aligned-title layout so all three report types share one visual
  // identity. showGeneratedAt is off: the footer on every page already
  // prints "Generated on" with full date+time and a page number.
  let y = drawCenteredBrandHeader(doc, branding, generatedAt, 'EXAM RESULT', 'All Candidates - Combined Result Summary', false);

  // Exam info panel - totalMarks/passingMarks/submittedAtUtc are exam-level
  // facts, so any entry's `result`/`context` carries the same values; the
  // first is as good as any.
  const first = entries[0];
  const totalMarks = first.result.totalMarks;
  const passingMarks = first.result.passingMarks;
  const passingPercent = totalMarks > 0 ? Math.round((passingMarks / totalMarks) * 100) : 0;
  const examDateValue = isResultFieldEnabled(first.context, branding, 'examDate')
    ? new Date(first.result.submittedAtUtc).toLocaleDateString()
    : '—';
  const infoPanelH = 32;
  panel(doc, MARGIN, y, CONTENT_WIDTH, infoPanelH);
  {
    const colW2 = CONTENT_WIDTH / 2;
    let ly = y + 7;
    fieldRow(doc, 'Exam Name', examTitle, MARGIN + 4, ly, 28, colW2 - 8);
    ly += 6.5;
    fieldRow(doc, 'Exam Code', first.context.examCode ?? '—', MARGIN + 4, ly, 28, colW2 - 8);
    ly += 6.5;
    fieldRow(doc, 'Exam Type', first.context.examType ?? '—', MARGIN + 4, ly, 28, colW2 - 8);
    ly += 6.5;
    fieldRow(doc, 'Exam Date', examDateValue, MARGIN + 4, ly, 28, colW2 - 8);

    let ry = y + 7;
    const rightX = MARGIN + colW2 + 4;
    fieldRow(
      doc,
      'Duration',
      first.context.durationMinutes ? `${first.context.durationMinutes} Minutes` : '—',
      rightX,
      ry,
      26,
      colW2 - 8,
    );
    ry += 6.5;
    fieldRow(doc, 'Total Marks', String(totalMarks), rightX, ry, 26, colW2 - 8);
    ry += 6.5;
    fieldRow(doc, 'Passing Marks', `${passingMarks} (${passingPercent}%)`, rightX, ry, 26, colW2 - 8);
  }
  y += infoPanelH + 6;

  // Total Candidates / Submitted / Passed / Failed / Not Submitted / Pass
  // Rate - totalCandidates/submittedCount/notSubmittedCount all come from
  // the caller's own computeExamAttendance() call (advanceExamReport.ts) -
  // the same authoritative attendance calculation Detailed Exam Report and
  // the Result Analytics export use, so none of the three can disagree
  // about who counts as submitted/not submitted. "Submitted" (not
  // "Attempted") deliberately - the Result Service's reporting data only
  // ever contains Submitted/AutoSubmitted attempts (see
  // computeExamAttendance's own doc comment), so this can't actually claim
  // anyone "started"/"attempted" in the stronger sense that word implies;
  // it only knows who has a submitted result. Passed/Failed intentionally
  // stay per-entry (every real attempt's own actual pass/fail, no dedup
  // for retakes - see advanceExamReport.ts's RETAKE / PASS-FAIL
  // ATTEMPT-SELECTION RULE note), matching what the table below lists.
  const { passed, failed, passRate } = computeExamResultSummary(entries);
  const statGap = 3;
  const statCardH = 24;
  const statW = (CONTENT_WIDTH - statGap * 5) / 6;
  const cardX = (i: number) => MARGIN + (statW + statGap) * i;
  drawStatCard(doc, cardX(0), y, statW, statCardH, BRAND, 'Total Candidates', String(attendance.totalCandidates), TEXT_DARK);
  drawStatCard(doc, cardX(1), y, statW, statCardH, BRAND, 'Submitted', String(attendance.submittedCount), TEXT_DARK);
  drawStatCard(doc, cardX(2), y, statW, statCardH, GREEN, 'Passed', String(passed), GREEN);
  drawStatCard(doc, cardX(3), y, statW, statCardH, RED, 'Failed', String(failed), RED);
  drawStatCard(doc, cardX(4), y, statW, statCardH, GRAY, 'Not Submitted', String(attendance.notSubmittedCount), TEXT_DARK);
  drawStatCard(doc, cardX(5), y, statW, statCardH, AMBER, 'Pass Rate', `${passRate}%`, AMBER);
  y += statCardH + 8;

  // Student Results table - paginates via ensurePageSpace, re-drawing the
  // header on any page it jumps to so a long roster stays readable.
  const tableColW = [10, 28, CONTENT_WIDTH - 10 - 28 - 24 - 20 - 24, 24, 20, 24];
  const headers = ['#', getRollNumberLabelForType(branding.organizationType), 'Student Name', 'Marks', '%', 'Result'];
  const rowH = 6.5;
  const drawHeader = () => {
    drawTableHeader(doc, MARGIN, y, tableColW, headers, rowH);
    y += rowH;
  };
  y = ensurePageSpace(doc, y, rowH * 2);
  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  entries.forEach(({ result, context }, i) => {
    const beforeY = y;
    y = ensurePageSpace(doc, y, rowH);
    if (y !== beforeY) {
      drawHeader();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    if (i % 2 === 1) {
      setColor(doc, 'setFillColor', { r: 250, g: 250, b: 251 });
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F');
    }
    const percent = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
    const rollNo = isResultFieldEnabled(context, branding, 'studentId') ? (context.rollNumber ?? '—') : '—';
    const cells = [
      String(i + 1),
      rollNo,
      context.studentName ?? 'Unknown',
      `${result.totalScore}/${result.totalMarks}`,
      `${percent}%`,
      result.passed ? 'PASS' : 'FAIL',
    ];
    let cx = MARGIN + 2;
    cells.forEach((c, ci) => {
      if (ci === 5) {
        setColor(doc, 'setTextColor', result.passed ? GREEN : RED);
        doc.setFont('helvetica', 'bold');
      } else {
        setColor(doc, 'setTextColor', TEXT_DARK);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(c, cx, y + rowH - 2);
      cx += tableColW[ci];
    });
    y += rowH;
  });
}

/** Thin wrapper kept only so callers don't reach for drawAcademicReport directly - every Organization Type uses the same compact single-page academic report layout now (see its own doc comment). */
function drawReport(
  doc: jsPDF,
  result: AdminAttemptResultResponse | ResultSummaryResponse,
  context: ResultPdfContext,
  branding: TenantBranding,
  isFirstInDocument: boolean,
  qrDataUrl: string | null = null,
): void {
  drawAcademicReport(doc, result, context, branding, isFirstInDocument, qrDataUrl);
}

export async function generateResultPdf(
  result: AdminAttemptResultResponse | ResultSummaryResponse,
  context: ResultPdfContext = {},
): Promise<void> {
  const branding = await loadTenantBranding();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const qrDataUrl = branding.showQrCodeForVerification
    ? await QRCode.toDataURL(`${window.location.origin}/results/${result.examId}`, { width: 160, margin: 1 }).catch(() => null)
    : null;
  drawReport(doc, result, context, branding, true, qrDataUrl);
  stampFooters(
    doc,
    generatedAt,
    branding.logo,
    branding.includeAddressInFooter ? branding.addressLine : null,
    branding.showLogoOnReports,
    branding.showPageNumbers,
  );
  doc.save(`${sanitizeFilename(result.examTitle)}-result.pdf`);
}

// AdminAttemptResultResponse only, not the ResultSummaryResponse a single
// student's own "my result" view uses - a whole-exam roster is an
// Admin/Instructor document (both real callers, ExamResults.tsx and the
// Organization Settings sample, only ever build this from
// getExamResultsForAdmin's AdminAttemptResultResponse[]), and drawing it
// needs userId (ResultSummaryResponse has none - it's implicitly "me") to
// tell apart unique candidates from repeat attempts by the same one for
// the "Submitted" count below.
export interface ExamResultBookletEntry {
  result: AdminAttemptResultResponse;
  context: ResultPdfContext;
}

/**
 * "Exam Result" - an exam-level roster of every candidate (see
 * drawExamResultRoster's own comment for why this is deliberately NOT the
 * per-student Student Result template repeated once per entry, which is
 * what this function used to do).
 *
 * `attendance` is optional and defaults to "everyone submitted, nobody
 * missing" (deduped by userId, same as the real computeExamAttendance would
 * give for a roster with no non-submitters) so a caller with no real roster
 * data (the Organization Settings sample preview) still renders correctly
 * rather than showing a wrong Not Submitted count.
 */
export async function generateExamResultsBooklet(
  examTitle: string,
  entries: ExamResultBookletEntry[],
  attendance?: ExamAttendance,
): Promise<void> {
  if (entries.length === 0) return;
  const branding = await loadTenantBranding();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const submittedCount = new Set(entries.map((e) => e.result.userId)).size;
  drawExamResultRoster(
    doc,
    examTitle,
    entries,
    branding,
    generatedAt,
    attendance ?? { totalCandidates: submittedCount, submittedCount, notSubmittedCount: 0 },
  );
  stampFooters(
    doc,
    generatedAt,
    branding.logo,
    branding.includeAddressInFooter ? branding.addressLine : null,
    branding.showLogoOnReports,
    branding.showPageNumbers,
  );
  doc.save(`${sanitizeFilename(examTitle)}-all-results.pdf`);
}
