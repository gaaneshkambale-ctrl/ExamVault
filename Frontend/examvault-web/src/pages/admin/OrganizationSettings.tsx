import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
  useUploadOrganizationAsset,
  useRemoveOrganizationAsset,
} from '../../hooks/useOrganizationSettings';
import { fetchOrganizationAssetObjectUrl } from '../../api/organizationSettingsApi';
import { listOrganizationTypes } from '../../api/organizationTypesApi';
import { useOrganizationAcademicConfig, useUpdateOrganizationAcademicConfig } from '../../hooks/useOrganizationAcademicConfig';
import {
  useAcademicListItems,
  useCreateAcademicListItem,
  useDeleteAcademicListItem,
} from '../../hooks/useAcademicListItems';
import type { AcademicListItem, AcademicListType } from '../../types/academicListItem';
import {
  getAcademicFieldsForType,
  getResultFieldKeysForType,
  getStudentFieldsForType,
  isResultFieldVisible,
  RESULT_FIELD_CATALOG,
  RESULT_FIELD_GROUPS,
} from '../../constants/organizationTypeFieldCatalog';
import { extractServerError } from '../../utils/apiError';
import { isReportTypeAvailable, REPORT_TYPE_CATALOG, type ReportTypeKey } from '../../constants/reportTypeCatalog';
import {
  MARGIN,
  CONTENT_WIDTH,
  PAGE_WIDTH,
  FOOTER_Y,
  GREEN,
  TEXT_DARK,
  TEXT_MUTED,
  BORDER,
  setColor,
  fieldRow,
  fitText,
  drawTableHeader,
  drawStatCard,
  hexToRgb,
} from '../../utils/pdfReportKit';
import {
  DEFAULT_BRANDING_COLORS,
  TIME_ZONES,
  LANGUAGES,
  DATE_FORMATS,
  type OrganizationSettings,
  type UpdateOrganizationSettingsRequest,
} from '../../types/organizationSettings';

const TABS = [
  'General',
  'Academic Configuration',
  'Branding & Assets',
  'Reports & Documents',
  'Email Settings',
  'Security & Compliance',
] as const;
type Tab = (typeof TABS)[number];

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1M9 13h1M14 9h1M14 13h1M9 21v-4h6v4" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-9.36L1 10" />
    </svg>
  );
}

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

function CardHeader({ icon, title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-3">
      <div className="d-flex align-items-start gap-2">
        <span className="text-primary mt-1">{icon}</span>
        <div>
          <div className="fw-bold">{title}</div>
          <div className="text-muted small">{subtitle}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, defaultValue, onChange }: ColorFieldProps) {
  return (
    <Col xs={6}>
      <Form.Label className="small">{label}</Form.Label>
      <div className="d-flex align-items-center gap-2">
        <Form.Control
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 38, padding: 2 }}
        />
        <Form.Control size="sm" value={value} onChange={(e) => onChange(e.target.value)} />
        <Button
          variant="outline-secondary"
          size="sm"
          title="Reset to default"
          onClick={() => onChange(defaultValue)}
        >
          <ResetIcon />
        </Button>
      </div>
    </Col>
  );
}

function toDraft(settings: OrganizationSettings): UpdateOrganizationSettingsRequest {
  const { hasLogo: _hasLogo, hasFavicon: _hasFavicon, hasSignature: _hasSignature, organizationCode: _organizationCode, ...draft } = settings;
  return draft;
}

// A single fixed sample dataset (John Doe / SXU2026001 / C# Programming) -
// clearly fake, obviously-labeled preview data, not a real student record.
// Its only job is to show how the current branding/toggle choices will
// render, matching the same purpose as the "Report Header Preview" card on
// the General tab, just with a full sample report body.
const SAMPLE_REPORT = {
  studentName: 'John Doe',
  registrationNo: 'SXU2026001',
  program: 'Bachelor of Computer Science',
  examName: 'C# Programming - Final Assessment',
  examDate: '12 Apr 2026',
  duration: '60 Minutes',
  rows: [
    { no: 1, subject: 'Basics', marks: 10, obtained: 9 },
    { no: 2, subject: 'OOP Concepts', marks: 10, obtained: 8 },
    { no: 3, subject: 'Exception Handling', marks: 10, obtained: 7 },
    { no: 4, subject: 'LINQ & Collections', marks: 10, obtained: 9 },
    { no: 5, subject: 'ASP.NET Core', marks: 10, obtained: 8 },
  ],
  verificationCode: 'SXU2026001',
};

// Second sample student - only used for the "Exam Result" (booklet) sample
// preview, to genuinely demonstrate that report type's real behavior
// (every student's result combined into one PDF, one page per student)
// rather than just relabeling the same single-student document.
const SAMPLE_REPORT_2 = {
  studentName: 'Priya Sharma',
  registrationNo: 'SXU2026002',
  program: 'Bachelor of Computer Science',
  examName: 'C# Programming - Final Assessment',
  examDate: '12 Apr 2026',
  duration: '60 Minutes',
  rows: [
    { no: 1, subject: 'Basics', marks: 10, obtained: 10 },
    { no: 2, subject: 'OOP Concepts', marks: 10, obtained: 9 },
    { no: 3, subject: 'Exception Handling', marks: 10, obtained: 8 },
    { no: 4, subject: 'LINQ & Collections', marks: 10, obtained: 10 },
    { no: 5, subject: 'ASP.NET Core', marks: 10, obtained: 9 },
  ],
  verificationCode: 'SXU2026002',
};

type SampleReportType = Extract<ReportTypeKey, 'studentResult' | 'examResultBooklet'>;

function QrPlaceholder() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm-2 9h7v7H3v-7zm2 2v3h3v-3H5zm9-13h7v7h-7V3zm2 2v3h3V5h-3zM14 14h2v2h-2zM17 14h3v2h-3zM14 17h2v3h-2zM17 17h3v3h-3z" />
    </svg>
  );
}

// Loads a (possibly blob:) object URL into an HTMLImageElement so it can be
// passed straight to jsPDF's addImage - resolves to null on any failure
// (no logo/signature uploaded, or the image failed to decode) rather than
// blocking the whole PDF export.
function loadImageElement(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// A visually QR-like grid of filled squares - not a real scannable code,
// just enough to show where/how one would render in the actual layout
// (this whole document is an explicitly-labeled sample).
function drawQrPlaceholder(doc: jsPDF, x: number, y: number, size: number) {
  const cells = 6;
  const cellSize = size / cells;
  const pattern = [
    [1, 1, 1, 0, 1, 1],
    [1, 0, 1, 0, 0, 1],
    [1, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 1],
    [1, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1],
  ];
  setColor(doc, 'setFillColor', TEXT_DARK);
  pattern.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
      }
    });
  });
}

interface PdfReportSettingsTabProps {
  draft: UpdateOrganizationSettingsRequest;
  set: <K extends keyof UpdateOrganizationSettingsRequest>(key: K, value: UpdateOrganizationSettingsRequest[K]) => void;
  logoUrl: string | null;
  signatureUrl: string | null;
}

function PdfReportSettingsTab({ draft, set, logoUrl, signatureUrl }: PdfReportSettingsTabProps) {
  const totalMarks = SAMPLE_REPORT.rows.reduce((sum, r) => sum + r.marks, 0);
  const totalObtained = SAMPLE_REPORT.rows.reduce((sum, r) => sum + r.obtained, 0);
  const percentage = Math.round((totalObtained / totalMarks) * 10000) / 100;
  const headerColor = draft.useBrandColorsInReportHeader
    ? draft.primaryColor ?? DEFAULT_BRANDING_COLORS.primaryColor
    : '#1F2937';

  // This preview's whole reason to exist is showing what the real generated
  // report will actually look like - it used to hardcode every
  // SAMPLE_REPORT field regardless of the tenant's real Result Fields
  // config, so unchecking eg. "Student / Candidate ID" there had zero
  // effect here (a real bug: a Preview that doesn't match the actual PDF is
  // worse than no preview). Gated with the same isResultFieldVisible the
  // real generateResultPdf.ts uses, so the two can't drift apart again.
  const { data: academicConfig } = useOrganizationAcademicConfig();
  const isFieldVisible = (key: string) => isResultFieldVisible(draft.organizationType, academicConfig?.resultFields, key);
  const sampleRegistrationNo = isFieldVisible('studentId') ? SAMPLE_REPORT.registrationNo : '—';
  const sampleExamDate = isFieldVisible('examDate') ? SAMPLE_REPORT.examDate : '—';
  const sampleDuration = isFieldVisible('duration') ? SAMPLE_REPORT.duration : '—';

  // Which report type the sample preview/download represents. "Exam Result"
  // (the booklet - see reportTypeCatalog.ts) isn't offered for every
  // Organization Type, so only show that toggle option when it actually is;
  // fall back to the always-available "Student Result" otherwise.
  const [sampleReportType, setSampleReportType] = useState<SampleReportType>('studentResult');
  const examResultBookletAvailable = isReportTypeAvailable(draft.organizationType, 'examResultBooklet');
  const sampleReportTypeOptions = (['studentResult', 'examResultBooklet'] as const).filter(
    (key) => key === 'studentResult' || examResultBookletAvailable,
  );

  // Draws one student's page into `doc` - shared by both sample report
  // types. "Student Result" calls this once; "Exam Result" (booklet) calls
  // it once per sample student with doc.addPage() between them, exactly
  // like the real generateExamResultsBooklet does for real students - one
  // draw function, so the two sample types can't independently drift the
  // way the whole sample preview once drifted from the real PDF.
  const drawSampleReportPage = async (
    doc: jsPDF,
    sample: typeof SAMPLE_REPORT,
    logoImg: HTMLImageElement | null,
    signatureImg: HTMLImageElement | null,
    brand: { r: number; g: number; b: number },
    pageNum: number,
    totalPages: number,
  ) => {
    const rowsTotalMarks = sample.rows.reduce((sum, r) => sum + r.marks, 0);
    const rowsTotalObtained = sample.rows.reduce((sum, r) => sum + r.obtained, 0);
    const pct = Math.round((rowsTotalObtained / rowsTotalMarks) * 10000) / 100;
    const passed = pct >= 40;
    const grade = pct >= 80 ? 'A' : pct >= 60 ? 'B' : 'C';

    // Header: mirrors drawAcademicReport's real header exactly (logo left,
    // name/Est. year/motto/address/registration all centered, Generated On
    // top-right) - this preview's whole reason to exist is showing what the
    // real generated report will actually look like, so it must not drift
    // into its own layout the way the old left-aligned version had.
    const logoH = 10;
    if (draft.showLogoOnPdfReports) {
      if (logoImg) {
        const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
        doc.addImage(logoImg, MARGIN, MARGIN, logoH * ratio, logoH);
      } else {
        setColor(doc, 'setFillColor', brand);
        doc.roundedRect(MARGIN, MARGIN, logoH, logoH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text((draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase(), MARGIN + logoH / 2, MARGIN + logoH / 2 + 1.5, {
          align: 'center',
        });
      }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, PAGE_WIDTH - MARGIN, MARGIN + 3, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setColor(doc, 'setTextColor', TEXT_DARK);
    const nameLine = draft.establishedYear ? `${draft.name || 'Institution Name'}  (Est. ${draft.establishedYear})` : draft.name || 'Institution Name';
    doc.text(nameLine, PAGE_WIDTH / 2, MARGIN + 5, { align: 'center' });
    let centerY = MARGIN + 10;
    if (draft.showMottoTagline && draft.mottoTagline) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(draft.mottoTagline, PAGE_WIDTH / 2, centerY, { align: 'center' });
      centerY += 4.5;
    }
    const addressParts = [
      [draft.addressLine1, draft.city, draft.state, draft.postalCode, draft.country].filter(Boolean).join(', '),
      ...(draft.showContactDetails ? [[draft.contactPhone, draft.contactEmail].filter(Boolean).join(' · '), draft.website] : []),
    ].filter((part): part is string => Boolean(part));
    if (addressParts.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(fitText(doc, addressParts.join('  |  '), CONTENT_WIDTH), PAGE_WIDTH / 2, centerY, { align: 'center' });
      centerY += 4;
    }
    if (draft.registrationNumber) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(`Reg. No: ${draft.registrationNumber}`, PAGE_WIDTH / 2, centerY, { align: 'center' });
      centerY += 4;
    }
    let y = Math.max(MARGIN + logoH + 4, centerY + 2);
    setColor(doc, 'setDrawColor', brand);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('OFFICIAL EXAMINATION REPORT', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 10;

    const fields: [string, string][] = [
      ['Student Name', sample.studentName],
      ['Registration No.', isFieldVisible('studentId') ? sample.registrationNo : '—'],
      ['Program', sample.program],
      ['Exam Name', sample.examName],
      ['Exam Date', isFieldVisible('examDate') ? sample.examDate : '—'],
      ['Duration', isFieldVisible('duration') ? sample.duration : '—'],
    ];
    fields.forEach(([label, value]) => {
      fieldRow(doc, label, value, MARGIN, y, 38, CONTENT_WIDTH);
      y += 6.5;
    });
    y += 4;

    const colWidths = [16, 94, 36, 36];
    const rowH = 7.5;
    const tableTop = y;
    drawTableHeader(doc, MARGIN, y, colWidths, ['Q.No', 'Subject / Section', 'Marks', 'Obtained'], rowH);
    y += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    sample.rows.forEach((r, i) => {
      if (i % 2 === 1) {
        setColor(doc, 'setFillColor', { r: 248, g: 250, b: 252 });
        doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F');
      }
      setColor(doc, 'setTextColor', TEXT_DARK);
      let cx = MARGIN + 2;
      doc.text(String(r.no), cx, y + rowH - 2.5);
      cx += colWidths[0];
      doc.text(r.subject, cx, y + rowH - 2.5);
      cx += colWidths[1];
      doc.text(String(r.marks), cx, y + rowH - 2.5);
      cx += colWidths[2];
      doc.text(String(r.obtained), cx, y + rowH - 2.5);
      y += rowH;
    });
    setColor(doc, 'setFillColor', { r: 238, g: 242, b: 255 });
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('Total Marks', MARGIN + 2, y + rowH - 2.5);
    doc.text(String(rowsTotalMarks), MARGIN + colWidths[0] + colWidths[1] + 2, y + rowH - 2.5);
    doc.text(String(rowsTotalObtained), MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + rowH - 2.5);
    y += rowH;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, tableTop, CONTENT_WIDTH, y - tableTop);
    y += 10;

    const cardW = (CONTENT_WIDTH - 12) / 3;
    drawStatCard(doc, MARGIN, y, cardW, 26, TEXT_DARK, 'Percentage', `${pct}%`, TEXT_DARK);
    drawStatCard(
      doc,
      MARGIN + cardW + 6,
      y,
      cardW,
      26,
      passed ? GREEN : { r: 220, g: 53, b: 69 },
      'Result',
      passed ? 'PASS' : 'FAIL',
      passed ? GREEN : { r: 220, g: 53, b: 69 },
    );
    drawStatCard(doc, MARGIN + (cardW + 6) * 2, y, cardW, 26, TEXT_DARK, 'Grade', grade, TEXT_DARK);
    y += 26 + 10;

    if (draft.showQrCodeForVerification) {
      const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/results/sample`, { width: 160, margin: 1 }).catch(
        () => null,
      );
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', MARGIN, y, 22, 22);
      } else {
        drawQrPlaceholder(doc, MARGIN, y, 22);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text('Scan to verify this report', MARGIN + 26, y + 8);
      doc.text(`Verification Code: ${sample.verificationCode}`, MARGIN + 26, y + 13);
    }

    const sigX = PAGE_WIDTH - MARGIN - 50;
    if (signatureImg) {
      doc.addImage(signatureImg, sigX, y, 40, 14);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text(draft.signatoryName || 'Authorized Signatory', sigX + 20, y + 19, { align: 'center' });
    if (draft.signatoryDesignation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(draft.signatoryDesignation, sigX + 20, y + 23, { align: 'center' });
    }

    y += 30;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text('This is a computer generated report and does not require a physical signature.', MARGIN, y);

    // Footer: mirrors drawFooter's real footer exactly (logo/wordmark left,
    // optional address line under it when "Include address in PDF footer"
    // is on, generated-on/page-number right).
    const generatedAt = new Date();
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, FOOTER_Y - 4, PAGE_WIDTH - MARGIN, FOOTER_Y - 4);
    if (draft.showLogoOnPdfReports) {
      if (logoImg) {
        const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
        const h = 4.5;
        doc.addImage(logoImg, MARGIN, FOOTER_Y - h + 0.5, h * ratio, h);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        setColor(doc, 'setTextColor', TEXT_DARK);
        doc.text(draft.name || 'ExamVault', MARGIN, FOOTER_Y);
      }
    }
    if (draft.includeAddressInPdfFooter) {
      const footerAddress = [draft.addressLine1, draft.city, draft.state, draft.country].filter(Boolean).join(', ');
      if (footerAddress) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, 'setTextColor', TEXT_MUTED);
        doc.text(fitText(doc, footerAddress, 110), MARGIN, FOOTER_Y + 3);
      }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(doc, 'setTextColor', TEXT_MUTED);
    doc.text(`Generated on: ${generatedAt.toLocaleString()}`, PAGE_WIDTH - MARGIN, FOOTER_Y - 3, { align: 'right' });
    if (draft.showPageNumbers) {
      doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, FOOTER_Y + 2, { align: 'right' });
    }
  };

  const buildSamplePdf = async () => {
    const doc = new jsPDF();
    const brand = draft.useBrandColorsInReportHeader ? hexToRgb(draft.primaryColor) : TEXT_DARK;
    const [logoImg, signatureImg] = await Promise.all([loadImageElement(logoUrl), loadImageElement(signatureUrl)]);
    // "Exam Result" draws 2 sample students (with a real doc.addPage()
    // between them) to genuinely demonstrate that report type's behavior -
    // every student's result combined into one PDF - rather than just
    // relabeling the single-student document.
    const samples = sampleReportType === 'examResultBooklet' ? [SAMPLE_REPORT, SAMPLE_REPORT_2] : [SAMPLE_REPORT];
    for (let i = 0; i < samples.length; i++) {
      if (i > 0) doc.addPage();
      await drawSampleReportPage(doc, samples[i], logoImg, signatureImg, brand, i + 1, samples.length);
    }
    return doc;
  };

  const handleDownloadSample = async () => {
    const doc = await buildSamplePdf();
    doc.save(sampleReportType === 'examResultBooklet' ? 'sample-exam-result-booklet.pdf' : 'sample-report.pdf');
  };

  // Opens the same generated PDF inline in a new tab (jsPDF's blob-URL
  // output) instead of forcing a download - lets the admin quickly check
  // how a setting change looks without cluttering their Downloads folder
  // every time.
  const handlePreviewSample = async () => {
    const doc = await buildSamplePdf();
    window.open(doc.output('bloburl'), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <CardHeader
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
                title="Live PDF Preview"
                subtitle={
                  sampleReportType === 'examResultBooklet'
                    ? "Every student's result for one exam, combined into a single PDF - shown below is page 1 of a 2-student sample."
                    : 'See how your settings will appear in the generated report.'
                }
                action={
                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" size="sm" onClick={handlePreviewSample}>
                      Preview PDF
                    </Button>
                    <Button variant="outline-primary" size="sm" onClick={handleDownloadSample}>
                      Download Sample
                    </Button>
                  </div>
                }
              />
              {sampleReportTypeOptions.length > 1 && (
                <div className="d-flex gap-2 mb-3">
                  {sampleReportTypeOptions.map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={sampleReportType === key ? 'primary' : 'outline-secondary'}
                      onClick={() => setSampleReportType(key)}
                    >
                      {REPORT_TYPE_CATALOG.find((r) => r.key === key)?.label ?? key}
                    </Button>
                  ))}
                </div>
              )}
              <Card className="border">
                <Card.Body>
                  {/* Mirrors the real centered header exactly (logo left,
                      name/Est. year/motto/address/registration centered) -
                      must track drawAcademicReport's layout, not its own. */}
                  <div className="d-flex align-items-start gap-2 mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2 overflow-hidden flex-shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: draft.showLogoOnPdfReports ? headerColor : 'transparent',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {draft.showLogoOnPdfReports &&
                        (logoUrl ? (
                          <img src={logoUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          (draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase()
                        ))}
                    </div>
                    <div className="flex-grow-1 text-center">
                      <div className="fw-bold">
                        {draft.name || 'Institution Name'}
                        {draft.establishedYear ? `  (Est. ${draft.establishedYear})` : ''}
                      </div>
                      {draft.showMottoTagline && draft.mottoTagline && (
                        <div className="text-muted small fst-italic">{draft.mottoTagline}</div>
                      )}
                      <div className="text-muted small">
                        {[
                          [draft.addressLine1, draft.city, draft.state, draft.postalCode, draft.country].filter(Boolean).join(', '),
                          ...(draft.showContactDetails
                            ? [[draft.contactPhone, draft.contactEmail].filter(Boolean).join(' · '), draft.website]
                            : []),
                        ]
                          .filter(Boolean)
                          .join('  |  ')}
                      </div>
                      {draft.registrationNumber && (
                        <div className="text-muted small">Reg. No: {draft.registrationNumber}</div>
                      )}
                    </div>
                    <div style={{ width: 40 }} />
                  </div>

                  <h6 className="text-center fw-bold mb-3">OFFICIAL EXAMINATION REPORT</h6>

                  <Row className="g-1 small mb-3">
                    <Col xs={6}>
                      <strong>Student Name:</strong> {SAMPLE_REPORT.studentName}
                    </Col>
                    <Col xs={6}>
                      <strong>Registration No.:</strong> {sampleRegistrationNo}
                    </Col>
                    <Col xs={6}>
                      <strong>Program:</strong> {SAMPLE_REPORT.program}
                    </Col>
                    <Col xs={6}>
                      <strong>Exam Name:</strong> {SAMPLE_REPORT.examName}
                    </Col>
                    <Col xs={6}>
                      <strong>Exam Date:</strong> {sampleExamDate}
                    </Col>
                    <Col xs={6}>
                      <strong>Duration:</strong> {sampleDuration}
                    </Col>
                  </Row>

                  <table className="table table-sm table-bordered small mb-3">
                    <thead className="table-light">
                      <tr>
                        <th>Q.No</th>
                        <th>Subject / Section</th>
                        <th>Marks</th>
                        <th>Obtained</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_REPORT.rows.map((r) => (
                        <tr key={r.no}>
                          <td>{r.no}</td>
                          <td>{r.subject}</td>
                          <td>{r.marks}</td>
                          <td>{r.obtained}</td>
                        </tr>
                      ))}
                      <tr className="fw-bold">
                        <td colSpan={2}>Total Marks</td>
                        <td>{totalMarks}</td>
                        <td>{totalObtained}</td>
                      </tr>
                    </tbody>
                  </table>

                  <Row className="g-2 mb-3 text-center">
                    <Col xs={4}>
                      <div className="rounded-2 bg-body-tertiary py-2">
                        <div className="text-muted small">Percentage</div>
                        <div className="fw-bold">{percentage}%</div>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="rounded-2 bg-success-subtle py-2">
                        <div className="text-muted small">Result</div>
                        <div className="fw-bold text-success">{percentage >= 40 ? 'PASS' : 'FAIL'}</div>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="rounded-2 bg-primary-subtle py-2">
                        <div className="text-muted small">Grade</div>
                        <div className="fw-bold">{percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C'}</div>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between align-items-end border-top pt-3">
                    {draft.showQrCodeForVerification ? (
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <QrPlaceholder />
                        <div>
                          Scan to verify this report
                          <div>Verification Code: {SAMPLE_REPORT.verificationCode}</div>
                        </div>
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="text-end">
                      {signatureUrl && (
                        <img src={signatureUrl} alt="Signature" style={{ maxHeight: 40, maxWidth: 120 }} />
                      )}
                      <div className="fw-medium small">{draft.signatoryName || 'Authorized Signatory'}</div>
                      <div className="text-muted small">{draft.signatoryDesignation}</div>
                    </div>
                  </div>

                  {/* Mirrors drawFooter's real footer exactly - shown on
                      every page of every generated report. */}
                  <div className="border-top pt-2 mt-3 d-flex justify-content-between align-items-start">
                    <div>
                      {draft.showLogoOnPdfReports &&
                        (logoUrl ? (
                          <img src={logoUrl} alt="" style={{ height: 16, objectFit: 'contain' }} />
                        ) : (
                          <div className="fw-bold small">{draft.name || 'ExamVault'}</div>
                        ))}
                      {draft.includeAddressInPdfFooter && (
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {[draft.addressLine1, draft.city, draft.state, draft.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-muted text-end" style={{ fontSize: 11 }}>
                      <div>Generated on: {new Date().toLocaleString()}</div>
                      {draft.showPageNumbers && <div>Page 1 of 1</div>}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <CardHeader
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 3h16a1 1 0 0 1 1 1v3H3V4a1 1 0 0 1 1-1z" />
                <rect x="3" y="7" width="18" height="14" rx="1" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            }
            title="Additional PDF Options"
            subtitle="Extra options specific to the generated report document"
          />
          <Row className="g-4">
            <Col xs={12} md={6}>
              <Form.Check
                type="switch"
                id="show-qr-code"
                label="Show QR code for verification"
                checked={draft.showQrCodeForVerification}
                onChange={(e) => set('showQrCodeForVerification', e.target.checked)}
                className="mb-3"
              />
              <Form.Check
                type="switch"
                id="show-contact-details"
                label="Show contact details (phone, email, website)"
                checked={draft.showContactDetails}
                onChange={(e) => set('showContactDetails', e.target.checked)}
                className="mb-3"
              />
            </Col>
            <Col xs={12} md={6}>
              <Form.Check
                type="switch"
                id="show-page-numbers"
                label="Show page numbers"
                checked={draft.showPageNumbers}
                onChange={(e) => set('showPageNumbers', e.target.checked)}
                className="mb-3"
              />
              <Form.Check
                type="switch"
                id="use-brand-colors-header"
                label="Use brand colors in report header"
                checked={draft.useBrandColorsInReportHeader}
                onChange={(e) => set('useBrandColorsInReportHeader', e.target.checked)}
                className="mb-3"
              />
              <Form.Check
                type="switch"
                id="enable-watermark"
                label="Enable watermark (Confidential)"
                checked={draft.enableWatermark}
                onChange={(e) => set('enableWatermark', e.target.checked)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
}

// Organization-type-specific fields (a College's University/Semester, a
// Coaching Institute's Batch/Rank, etc.) - a completely separate backend
// resource from the rest of Organization Settings (its own GET/PUT, its own
// save button here) since it lives on its own table
// (OrganizationAcademicConfig), not on Tenant. Which fields appear is driven
// entirely by the tenant's current (locked - see the General tab's
// Institution Type field) Organization Type, via
// constants/organizationTypeFieldCatalog.ts. Storage-only for now - no PDF
// or report generator reads this data yet.
function AcademicConfigurationTab({
  organizationType,
  organizationCode,
}: {
  organizationType: string | null;
  organizationCode: string | null;
}) {
  const { data: config, isLoading, isError } = useOrganizationAcademicConfig();
  const updateMutation = useUpdateOrganizationAcademicConfig();

  const [academicFields, setAcademicFields] = useState<Record<string, string>>({});
  const [resultFields, setResultFields] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const fieldDefs = getAcademicFieldsForType(organizationType);
  // Gated on the Student field catalog, not this tab's own academicFields
  // catalog - Program/Department/Semester/Division were deliberately
  // removed from the latter (see organizationTypeFieldCatalog.ts) once they
  // became real managed lists, so it's the Student catalog that still says
  // which org types actually use this hierarchy.
  const hasHierarchicalLists = ['program', 'department', 'semester', 'division'].some((key) =>
    getStudentFieldsForType(organizationType).some((f) => f.key === key),
  );
  const relevantResultKeys = getResultFieldKeysForType(organizationType);
  const resultFieldDefs = RESULT_FIELD_CATALOG.filter((f) => relevantResultKeys.includes(f.key));
  const resultFieldGroups = RESULT_FIELD_GROUPS.map((group) => ({
    group,
    fields: resultFieldDefs.filter((f) => f.group === group),
  })).filter((g) => g.fields.length > 0);
  // "Coming soon" fields can never be recommended/checked - there's nothing
  // yet for the PDF generator to read even if they were on (see each field's
  // comingSoon comment in organizationTypeFieldCatalog.ts).
  const recommendedResultFieldKeys = resultFieldDefs.filter((f) => !f.comingSoon).map((f) => f.key);

  useEffect(() => {
    if (config) {
      setAcademicFields(config.academicFields);
      // An empty saved list means "never configured" - the PDF generator's
      // own fallback (isResultFieldEnabled) already treats that as "show
      // everything", so seed the checklist with the recommended keys rather
      // than leave every box unchecked while the PDF quietly shows them
      // anyway. Saving without changing anything then persists the same
      // real behavior, just made visible.
      setResultFields(config.resultFields.length > 0 ? config.resultFields : recommendedResultFieldKeys);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const toggleResultField = (key: string, checked: boolean) => {
    setResultFields((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const resetToRecommended = () => setResultFields(recommendedResultFieldKeys);

  // collegeCode isn't real academicFields data - it's the read-only Tenant
  // OrganizationCode rendered inline below (see the fieldDefs.map special
  // case). program/department/semester/division are no longer in this
  // tab's field catalog at all - they're real managed lists now (see
  // organizationTypeFieldCatalog.ts). Stripped from both the save payload
  // and the dirty-check below so a stale value from before either change
  // doesn't keep round-tripping through the JSON blob or falsely show as
  // an unsaved change.
  const STRIPPED_ACADEMIC_FIELD_KEYS = ['collegeCode', 'program', 'department', 'semester', 'division'];
  const normalizeAcademicFields = (fields: Record<string, string> | undefined): string => {
    const result: Record<string, string> = {};
    Object.keys(fields ?? {})
      .sort()
      .forEach((key) => {
        if (STRIPPED_ACADEMIC_FIELD_KEYS.includes(key)) return;
        const value = fields?.[key];
        if (value) result[key] = value;
      });
    return JSON.stringify(result);
  };
  const sameResultFieldSet = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every((key) => setB.has(key));
  };
  const isDirty =
    !!config &&
    (normalizeAcademicFields(academicFields) !== normalizeAcademicFields(config.academicFields) ||
      !sameResultFieldSet(resultFields, config.resultFields.length > 0 ? config.resultFields : recommendedResultFieldKeys));

  const save = async () => {
    setSaved(false);
    const fieldsToSave = { ...academicFields };
    STRIPPED_ACADEMIC_FIELD_KEYS.forEach((key) => delete fieldsToSave[key]);
    await updateMutation.mutateAsync({ academicFields: fieldsToSave, resultFields });
    setSaved(true);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center text-danger py-5">Couldn't load academic configuration. Please try again.</div>;
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <CardHeader
            icon={<BuildingIcon />}
            title="Academic Configuration"
            subtitle={`Fields specific to "${organizationType ?? 'your organization type'}" - shown on generated reports in a future update.`}
          />
          {fieldDefs.length === 0 ? (
            <div className="text-muted small py-3">
              No specific academic fields are defined yet for this organization type.
            </div>
          ) : (
            <Row className="g-3">
              {fieldDefs.map((field) =>
                field.key === 'collegeCode' ? (
                  <Col xs={12} md={6} key={field.key}>
                    <Form.Label className="small">{field.label}</Form.Label>
                    <Form.Control value={organizationCode ?? ''} disabled readOnly />
                    <Form.Text className="text-muted">
                      Auto-generated Organization ID - set when the tenant was created, not editable here.
                    </Form.Text>
                  </Col>
                ) : (
                  <Col xs={12} md={6} key={field.key}>
                    <Form.Label className="small">{field.label}</Form.Label>
                    <Form.Control
                      value={academicFields[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => setAcademicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </Col>
                ),
              )}
            </Row>
          )}
        </Card.Body>
      </Card>

      {hasHierarchicalLists && <AcademicListsManager />}

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <CardHeader
            icon={<BuildingIcon />}
            title="Result Fields"
            subtitle="Configure which information appears in student results and exam reports for this organization type."
          />
          <p className="text-muted small mb-3">
            Student Name, Exam Name, Marks, Percentage, Grade, and Result always appear on every generated report -
            only the fields below can be turned on or off.
          </p>
          {resultFieldGroups.length === 0 ? (
            <div className="text-muted small py-3">No specific result fields are defined yet for this organization type.</div>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <span className="text-success small">
                  ✓ Recommended fields loaded automatically for "{organizationType ?? 'your organization type'}"
                </span>
                <Button variant="outline-secondary" size="sm" onClick={resetToRecommended}>
                  Reset to Recommended
                </Button>
              </div>
              {resultFieldGroups.map(({ group, fields }) => (
                <div key={group} className="mb-3">
                  <div className="fw-bold small text-muted text-uppercase mb-2">{group}</div>
                  <Row className="g-2">
                    {fields.map((field) => (
                      <Col xs={12} sm={6} md={4} key={field.key}>
                        <Form.Check
                          type="checkbox"
                          id={`result-field-${field.key}`}
                          label={field.comingSoon ? `${field.label} (Coming soon)` : field.label}
                          checked={!field.comingSoon && resultFields.includes(field.key)}
                          disabled={field.comingSoon}
                          onChange={(e) => toggleResultField(field.key, e.target.checked)}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}
            </>
          )}
        </Card.Body>
      </Card>

      {updateMutation.isError && <Alert variant="danger">{extractServerError(updateMutation.error)}</Alert>}
      {saved && !updateMutation.isError && (
        <Alert variant="success" dismissible onClose={() => setSaved(false)}>
          Academic configuration saved.
        </Alert>
      )}
      {config?.updatedAtUtc && (
        <p className="text-muted small mb-3">Last updated {new Date(config.updatedAtUtc).toLocaleString()}</p>
      )}

      <div className="d-flex justify-content-between align-items-center">
        <span>
          {isDirty && (
            <Badge bg="warning-subtle" text="warning-emphasis" className="fw-normal">
              Unsaved changes
            </Badge>
          )}
        </span>
        <Button variant="primary" onClick={save} disabled={updateMutation.isPending || !isDirty}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}

const LIST_LEVELS: { listType: AcademicListType; label: string }[] = [
  { listType: 'Program', label: 'Programs' },
  { listType: 'Department', label: 'Departments' },
  { listType: 'Semester', label: 'Semesters' },
  { listType: 'Division', label: 'Divisions / Classes' },
];

// Chips-plus-add-box editor for one level of the Program -> Department ->
// Semester -> Division hierarchy. Purely presentational - the parent
// (AcademicListsManager) owns which parent item's children this shows.
function ListLevelEditor({
  label,
  singularLabel,
  items,
  isLoading,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
  adding,
}: {
  label: string;
  singularLabel: string;
  items: AcademicListItem[];
  isLoading: boolean;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  adding: boolean;
}) {
  return (
    <div>
      <Form.Label className="small fw-bold">{label}</Form.Label>
      {isLoading ? (
        <div className="text-muted small mb-2">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-muted small mb-2">None added yet.</div>
      ) : (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              bg="light"
              text="dark"
              className="border d-flex align-items-center gap-2 py-2 px-3 fw-normal"
            >
              {item.value}
              <Button
                variant="link"
                className="p-0 text-danger text-decoration-none"
                style={{ lineHeight: 1 }}
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.value}`}
              >
                &times;
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <InputGroup size="sm" style={{ maxWidth: 420 }}>
        <Form.Control
          placeholder={`Add a new ${singularLabel}`}
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button variant="outline-primary" onClick={onAdd} disabled={!newValue.trim() || adding}>
          Add
        </Button>
      </InputGroup>
    </div>
  );
}

// Lets the tenant Admin define the values Student Academic Details and Exam
// academic fields pick from (see AcademicHierarchyFields) instead of typing
// free text every time. Hierarchical: pick a Program to manage its
// Departments, pick a Department to manage its Semesters, pick a Semester to
// manage its Divisions/Classes - each level only shows once its parent is
// selected, mirroring how the picker itself cascades.
function AcademicListsManager() {
  const [programId, setProgramId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [newValues, setNewValues] = useState<Record<AcademicListType, string>>({
    Program: '',
    Department: '',
    Semester: '',
    Division: '',
  });

  const programs = useAcademicListItems('Program', null);
  const departments = useAcademicListItems('Department', programId || null, !!programId);
  const semesters = useAcademicListItems('Semester', departmentId || null, !!departmentId);
  const divisions = useAcademicListItems('Division', semesterId || null, !!semesterId);

  const createMutation = useCreateAcademicListItem();
  const deleteMutation = useDeleteAcademicListItem();

  useEffect(() => {
    setDepartmentId('');
  }, [programId]);
  useEffect(() => {
    setSemesterId('');
  }, [departmentId]);

  const setNewValue = (listType: AcademicListType, value: string) =>
    setNewValues((prev) => ({ ...prev, [listType]: value }));

  const add = async (listType: AcademicListType, parentId: string | null) => {
    const value = newValues[listType].trim();
    if (!value) return;
    await createMutation.mutateAsync({ listType, value, parentId });
    setNewValue(listType, '');
  };

  const [pendingDelete, setPendingDelete] = useState<{ item: AcademicListItem; childWarning: string | null } | null>(
    null,
  );

  // Deleting a Program/Department/Semester cascades to everything defined
  // under it server-side (see DeleteAcademicListItemHandler), so this asks
  // first via a styled in-app modal rather than a native window.confirm -
  // consistent with the rest of the app's look, and avoids the browser
  // automation risk a blocking native dialog carries.
  const requestRemove = (listType: AcademicListType, item: AcademicListItem) => {
    const childLevel = LIST_LEVELS[LIST_LEVELS.findIndex((l) => l.listType === listType) + 1];
    setPendingDelete({ item, childWarning: childLevel ? `every ${childLevel.label} defined under it` : null });
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync(pendingDelete.item.id);
    setPendingDelete(null);
  };

  const selectedProgram = programs.data?.find((p) => p.id === programId);
  const selectedDepartment = departments.data?.find((d) => d.id === departmentId);
  const selectedSemester = semesters.data?.find((s) => s.id === semesterId);

  return (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body>
        <CardHeader
          icon={<BuildingIcon />}
          title="Program / Department / Semester / Division Lists"
          subtitle="Define the values Student Details and Exam fields pick from - each level narrows to the one picked above it."
        />

        <ListLevelEditor
          label="Programs"
          singularLabel="Program"
          items={programs.data ?? []}
          isLoading={programs.isLoading}
          newValue={newValues.Program}
          onNewValueChange={(v) => setNewValue('Program', v)}
          onAdd={() => add('Program', null)}
          onRemove={(id) => {
            const item = programs.data?.find((p) => p.id === id);
            if (item) requestRemove('Program', item);
          }}
          adding={createMutation.isPending}
        />

        {(programs.data?.length ?? 0) > 0 && (
          <div className="mt-4 pt-3 border-top">
            <Form.Label className="small fw-bold">Manage Departments for</Form.Label>
            <Form.Select
              size="sm"
              style={{ maxWidth: 320 }}
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">Choose a Program...</option>
              {programs.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.value}
                </option>
              ))}
            </Form.Select>
            {selectedProgram && (
              <div className="mt-2">
                <ListLevelEditor
                  label="Departments"
                  singularLabel="Department"
                  items={departments.data ?? []}
                  isLoading={departments.isLoading}
                  newValue={newValues.Department}
                  onNewValueChange={(v) => setNewValue('Department', v)}
                  onAdd={() => add('Department', programId)}
                  onRemove={(id) => {
                    const item = departments.data?.find((d) => d.id === id);
                    if (item) requestRemove('Department', item);
                  }}
                  adding={createMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {selectedProgram && (departments.data?.length ?? 0) > 0 && (
          <div className="mt-4 pt-3 border-top">
            <Form.Label className="small fw-bold">Manage Semesters for</Form.Label>
            <Form.Select
              size="sm"
              style={{ maxWidth: 320 }}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Choose a Department...</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.value}
                </option>
              ))}
            </Form.Select>
            {selectedDepartment && (
              <div className="mt-2">
                <ListLevelEditor
                  label="Semesters"
                  singularLabel="Semester"
                  items={semesters.data ?? []}
                  isLoading={semesters.isLoading}
                  newValue={newValues.Semester}
                  onNewValueChange={(v) => setNewValue('Semester', v)}
                  onAdd={() => add('Semester', departmentId)}
                  onRemove={(id) => {
                    const item = semesters.data?.find((s) => s.id === id);
                    if (item) requestRemove('Semester', item);
                  }}
                  adding={createMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {selectedDepartment && (semesters.data?.length ?? 0) > 0 && (
          <div className="mt-4 pt-3 border-top">
            <Form.Label className="small fw-bold">Manage Divisions / Classes for</Form.Label>
            <Form.Select
              size="sm"
              style={{ maxWidth: 320 }}
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
            >
              <option value="">Choose a Semester...</option>
              {semesters.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.value}
                </option>
              ))}
            </Form.Select>
            {selectedSemester && (
              <div className="mt-2">
                <ListLevelEditor
                  label="Divisions / Classes"
                  singularLabel="Division / Class"
                  items={divisions.data ?? []}
                  isLoading={divisions.isLoading}
                  newValue={newValues.Division}
                  onNewValueChange={(v) => setNewValue('Division', v)}
                  onAdd={() => add('Division', semesterId)}
                  onRemove={(id) => {
                    const item = divisions.data?.find((d) => d.id === id);
                    if (item) requestRemove('Division', item);
                  }}
                  adding={createMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {createMutation.isError && (
          <Alert variant="danger" className="mt-3 mb-0">
            {extractServerError(createMutation.error)}
          </Alert>
        )}
      </Card.Body>

      <Modal show={!!pendingDelete} onHide={() => setPendingDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 mb-0">Remove "{pendingDelete?.item.value}"?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 text-muted">
            {pendingDelete?.childWarning
              ? `This also removes ${pendingDelete.childWarning}. This can't be undone.`
              : "This can't be undone."}
          </p>
          {deleteMutation.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {extractServerError(deleteMutation.error)}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRemove} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Removing...' : 'Remove'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

export default function OrganizationSettingsPage() {
  const { data: settings, isLoading, isError } = useOrganizationSettings();
  const updateMutation = useUpdateOrganizationSettings();
  const uploadAssetMutation = useUploadOrganizationAsset();
  const removeAssetMutation = useRemoveOrganizationAsset();
  const { data: organizationTypes } = useQuery({ queryKey: ['organization-types'], queryFn: listOrganizationTypes });

  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [draft, setDraft] = useState<UpdateOrganizationSettingsRequest | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Only seeds `draft` on the initial load - a background refetch of
  // `settings` (tab switch, window focus, post-mutation invalidation) must
  // never re-run this, or it silently discards whatever the admin is
  // mid-typing (and a Save right after persists that clobbered draft,
  // wiping out fields that were already saved - see ActionPlan.txt).
  const hasInitializedDraft = useRef(false);
  useEffect(() => {
    if (settings && !hasInitializedDraft.current) {
      setDraft(toDraft(settings));
      hasInitializedDraft.current = true;
    }
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (settings?.hasLogo) {
      fetchOrganizationAssetObjectUrl('logo').then((url) => {
        if (!cancelled) {
          objectUrl = url;
          setLogoUrl(url);
        }
      });
    } else {
      setLogoUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings?.hasLogo]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (settings?.hasFavicon) {
      fetchOrganizationAssetObjectUrl('favicon').then((url) => {
        if (!cancelled) {
          objectUrl = url;
          setFaviconUrl(url);
        }
      });
    } else {
      setFaviconUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings?.hasFavicon]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (settings?.hasSignature) {
      fetchOrganizationAssetObjectUrl('signature').then((url) => {
        if (!cancelled) {
          objectUrl = url;
          setSignatureUrl(url);
        }
      });
    } else {
      setSignatureUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings?.hasSignature]);

  if (isLoading) {
    return (
      <AdminLayout active="Settings">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !settings || !draft) {
    return (
      <AdminLayout active="Settings">
        <div className="text-center text-danger py-5">Couldn't load organization settings. Please try again.</div>
      </AdminLayout>
    );
  }

  const set = <K extends keyof UpdateOrganizationSettingsRequest>(key: K, value: UpdateOrganizationSettingsRequest[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    setSaveError('');
    setSaved(false);
    try {
      await updateMutation.mutateAsync(draft);
      setSaved(true);
    } catch (error) {
      setSaveError(extractServerError(error));
    }
  };

  const handleReset = () => setDraft(toDraft(settings));

  const handleAssetUpload = (asset: 'logo' | 'favicon' | 'signature') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAssetMutation.mutate({ asset, file });
    }
    e.target.value = '';
  };

  return (
    <AdminLayout active="Settings">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-start gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary flex-shrink-0"
            style={{ width: 44, height: 44 }}
          >
            <BuildingIcon />
          </div>
          <div>
            <h1 className="h4 fw-bold mb-1">Organization Settings</h1>
            <p className="text-muted mb-0">
              Manage your institution details, branding, and default settings for reports and communications.
            </p>
          </div>
        </div>
        <div className="text-end">
          <div className="mb-1">
            <Badge bg="success-subtle" text="success-emphasis" className="fw-normal me-1">
              ● Active
            </Badge>
            {/* Organization Type is fixed at creation (see the General tab's own
                note - only Super Admin can change it), so this is a persistent
                read-only indicator of which type's rules apply across every tab
                below, not an editable selector - there's nothing to switch to at
                this level. Matches the architecture doc's "always-visible
                Organization Type" intent without fabricating an edit control
                that doesn't exist here. */}
            {draft.organizationType && (
              <Badge bg="primary-subtle" text="primary-emphasis" className="fw-normal">
                {draft.organizationType}
              </Badge>
            )}
          </div>
          <div className="text-muted small">Organization ID: {settings.organizationCode ?? '—'}</div>
        </div>
      </div>

      {saveError && <Alert variant="danger">{saveError}</Alert>}
      {saved && (
        <Alert variant="success" dismissible onClose={() => setSaved(false)}>
          Organization settings saved.
        </Alert>
      )}

      <div className="d-flex gap-1 border-bottom mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="btn btn-link text-decoration-none px-3 py-2"
            style={
              tab === activeTab
                ? { color: '#4f46e5', fontWeight: 600, borderBottom: '2px solid #4f46e5' }
                : { color: '#64748b' }
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Reports & Documents' ? (
        <PdfReportSettingsTab draft={draft} set={set} logoUrl={logoUrl} signatureUrl={signatureUrl} />
      ) : activeTab === 'Academic Configuration' ? (
        <AcademicConfigurationTab organizationType={draft.organizationType} organizationCode={settings.organizationCode} />
      ) : activeTab !== 'General' ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">{activeTab}'s settings are coming soon.</Card.Body>
        </Card>
      ) : (
        <>
          <Row className="g-3 mb-3">
            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" />
                      </svg>
                    }
                    title="Institution Information"
                    subtitle="Basic details about your institution"
                  />
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Institution Name *</Form.Label>
                      <Form.Control value={draft.name} disabled readOnly />
                      <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                        Set when the organization was created - contact Super Admin to change.
                      </div>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Short Name / Abbreviation</Form.Label>
                      <Form.Control value={draft.shortName ?? ''} onChange={(e) => set('shortName', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Institution Type</Form.Label>
                      <Form.Select value={draft.organizationType ?? ''} disabled>
                        <option value="">Select type</option>
                        {draft.organizationType &&
                          !organizationTypes?.some((t) => t.name === draft.organizationType) && (
                            <option value={draft.organizationType}>{draft.organizationType}</option>
                          )}
                        {(organizationTypes ?? []).map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </Form.Select>
                      <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                        Set when the organization was created - contact Super Admin to change. See the Academic
                        Configuration tab for type-specific details.
                      </div>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Established Year</Form.Label>
                      <Form.Control
                        type="number"
                        value={draft.establishedYear ?? ''}
                        onChange={(e) => set('establishedYear', e.target.value ? Number(e.target.value) : null)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Website</Form.Label>
                      <Form.Control value={draft.website ?? ''} onChange={(e) => set('website', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Contact Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={draft.contactEmail ?? ''}
                        onChange={(e) => set('contactEmail', e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Contact Phone</Form.Label>
                      <Form.Control value={draft.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Alternate Phone (Optional)</Form.Label>
                      <Form.Control
                        value={draft.alternatePhone ?? ''}
                        onChange={(e) => set('alternatePhone', e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Registration / Accreditation No.</Form.Label>
                      <Form.Control
                        value={draft.registrationNumber ?? ''}
                        onChange={(e) => set('registrationNumber', e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Tax / Identification No. (Optional)</Form.Label>
                      <Form.Control
                        value={draft.taxIdentificationNumber ?? ''}
                        onChange={(e) => set('taxIdentificationNumber', e.target.value)}
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Time Zone</Form.Label>
                      <Form.Select value={draft.timeZone ?? ''} onChange={(e) => set('timeZone', e.target.value)}>
                        <option value="">Select time zone</option>
                        {TIME_ZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                    }
                    title="Logo & Visual Identity"
                    subtitle="Upload your institution logo and visual elements"
                  />
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 bg-body-tertiary flex-shrink-0 overflow-hidden"
                      style={{ width: 96, height: 96 }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Institution logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      ) : (
                        <span className="text-muted small">No logo</span>
                      )}
                    </div>
                    <div>
                      <div className="fw-medium">{draft.name || 'Your institution'}</div>
                      <div className="text-muted small">Recommended: 400 x 400 px (PNG, JPG). Max size: 2 MB</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mb-4">
                    <Button variant="outline-primary" size="sm" as="label" style={{ cursor: 'pointer' }}>
                      Upload Logo
                      <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAssetUpload('logo')} />
                    </Button>
                    {settings.hasLogo && (
                      <Button variant="outline-danger" size="sm" onClick={() => removeAssetMutation.mutate('logo')}>
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2 bg-body-tertiary flex-shrink-0 overflow-hidden"
                      style={{ width: 40, height: 40 }}
                    >
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Favicon" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      ) : (
                        <span className="text-muted" style={{ fontSize: 10 }}>
                          None
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-muted small mb-1">16 x 16 or 32 x 32 (ICO, PNG)</div>
                      <div className="d-flex gap-2">
                        <Button variant="outline-secondary" size="sm" as="label" style={{ cursor: 'pointer' }}>
                          Upload Favicon
                          <input
                            type="file"
                            accept="image/png,image/x-icon"
                            hidden
                            onChange={handleAssetUpload('favicon')}
                          />
                        </Button>
                        {settings.hasFavicon && (
                          <Button variant="outline-danger" size="sm" onClick={() => removeAssetMutation.mutate('favicon')}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                    }
                    title="Address & Location"
                    subtitle="Official address of your institution"
                  />
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Address Line 1</Form.Label>
                      <Form.Control value={draft.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Address Line 2</Form.Label>
                      <Form.Control value={draft.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="small">City</Form.Label>
                      <Form.Control value={draft.city ?? ''} onChange={(e) => set('city', e.target.value)} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="small">State / Province</Form.Label>
                      <Form.Control value={draft.state ?? ''} onChange={(e) => set('state', e.target.value)} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Label className="small">ZIP / Postal Code</Form.Label>
                      <Form.Control value={draft.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Country</Form.Label>
                      <Form.Control value={draft.country ?? ''} onChange={(e) => set('country', e.target.value)} />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                      </svg>
                    }
                    title="Default Branding Colors"
                    subtitle="Customize your institution's brand colors for reports and portal"
                  />
                  <Row className="g-3">
                    <ColorField
                      label="Primary Color"
                      value={draft.primaryColor ?? DEFAULT_BRANDING_COLORS.primaryColor}
                      defaultValue={DEFAULT_BRANDING_COLORS.primaryColor}
                      onChange={(v) => set('primaryColor', v)}
                    />
                    <ColorField
                      label="Secondary Color"
                      value={draft.secondaryColor ?? DEFAULT_BRANDING_COLORS.secondaryColor}
                      defaultValue={DEFAULT_BRANDING_COLORS.secondaryColor}
                      onChange={(v) => set('secondaryColor', v)}
                    />
                    <ColorField
                      label="Accent Color"
                      value={draft.accentColor ?? DEFAULT_BRANDING_COLORS.accentColor}
                      defaultValue={DEFAULT_BRANDING_COLORS.accentColor}
                      onChange={(v) => set('accentColor', v)}
                    />
                    <ColorField
                      label="Text Color"
                      value={draft.textColor ?? DEFAULT_BRANDING_COLORS.textColor}
                      defaultValue={DEFAULT_BRANDING_COLORS.textColor}
                      onChange={(v) => set('textColor', v)}
                    />
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    }
                    title="Authorized Signatory"
                    subtitle="Details used in PDF reports and official communications"
                  />
                  <Row className="g-3 mb-3">
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Name *</Form.Label>
                      <Form.Control value={draft.signatoryName ?? ''} onChange={(e) => set('signatoryName', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Designation</Form.Label>
                      <Form.Control
                        value={draft.signatoryDesignation ?? ''}
                        onChange={(e) => set('signatoryDesignation', e.target.value)}
                      />
                    </Col>
                  </Row>
                  <Form.Label className="small">Signature Image</Form.Label>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2 border bg-body-tertiary flex-shrink-0 overflow-hidden"
                      style={{ width: 100, height: 50 }}
                    >
                      {signatureUrl ? (
                        <img src={signatureUrl} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      ) : (
                        <span className="text-muted small">None</span>
                      )}
                    </div>
                    <Button variant="outline-primary" size="sm" as="label" style={{ cursor: 'pointer' }}>
                      Upload
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={handleAssetUpload('signature')}
                      />
                    </Button>
                    {settings.hasSignature && (
                      <Button variant="outline-danger" size="sm" onClick={() => removeAssetMutation.mutate('signature')}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="text-muted small mt-2">Recommended: 300 x 100 px (PNG, transparent background)</div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm h-100 bg-primary-subtle">
                <Card.Body>
                  <CardHeader
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                    title="Report Header Preview"
                    subtitle=""
                  />
                  <Card className="border-0">
                    <Card.Body>
                      {/* Matches drawAcademicReport's real header exactly (logo
                          left, name/tagline/address/registration centered) -
                          this preview's whole reason to exist is showing what
                          the real generated report will actually look like,
                          so it must track that layout, not invent its own. */}
                      <div className="d-flex align-items-start gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2 overflow-hidden flex-shrink-0"
                          style={{
                            width: 40,
                            height: 40,
                            background: draft.showLogoOnPdfReports
                              ? draft.primaryColor ?? DEFAULT_BRANDING_COLORS.primaryColor
                              : 'transparent',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {draft.showLogoOnPdfReports &&
                            (logoUrl ? (
                              <img
                                src={logoUrl}
                                alt=""
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              (draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase()
                            ))}
                        </div>
                        <div className="flex-grow-1 text-center">
                          <div className="fw-bold">
                            {draft.name || 'Institution Name'}
                            {draft.establishedYear ? `  (Est. ${draft.establishedYear})` : ''}
                          </div>
                          {draft.showMottoTagline && draft.mottoTagline && (
                            <div className="text-muted small fst-italic">{draft.mottoTagline}</div>
                          )}
                          <div className="text-muted small">
                            {[
                              [draft.addressLine1, draft.city, draft.state, draft.country].filter(Boolean).join(', '),
                              ...(draft.showContactDetails
                                ? [[draft.contactPhone, draft.contactEmail].filter(Boolean).join(' · '), draft.website]
                                : []),
                            ]
                              .filter(Boolean)
                              .join('  |  ') || 'Address will appear here'}
                          </div>
                          {draft.registrationNumber && (
                            <div className="text-muted small">Reg. No: {draft.registrationNumber}</div>
                          )}
                        </div>
                        <div style={{ width: 40 }} />
                      </div>
                    </Card.Body>
                  </Card>
                  <Card className="border-0 mt-2">
                    <Card.Body>
                      {/* Matches drawFooter's real footer exactly (logo/wordmark
                          left, optional address line under it when "Include
                          address in PDF footer" is on, generated-on/page-number
                          right) - shown on every generated report's pages. */}
                      <div className="border-top pt-2 d-flex justify-content-between align-items-start">
                        <div>
                          {draft.showLogoOnPdfReports &&
                            (logoUrl ? (
                              <img src={logoUrl} alt="" style={{ height: 16, objectFit: 'contain' }} />
                            ) : (
                              <div className="fw-bold small">ExamVault</div>
                            ))}
                          {draft.includeAddressInPdfFooter && (
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {[draft.addressLine1, draft.city, draft.state, draft.country].filter(Boolean).join(', ') ||
                                'Address will appear here'}
                            </div>
                          )}
                        </div>
                        <div className="text-muted text-end" style={{ fontSize: 11 }}>
                          <div>Generated on: {new Date().toLocaleString()}</div>
                          {draft.showPageNumbers && <div>Page 1 of 1</div>}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <CardHeader
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                }
                title="Additional Settings"
                subtitle="Other organizational preferences"
              />
              <Row className="g-4">
                <Col xs={12} md={6}>
                  <Form.Check
                    type="switch"
                    id="show-logo-pdf"
                    label="Show institution logo on all PDF reports"
                    checked={draft.showLogoOnPdfReports}
                    onChange={(e) => set('showLogoOnPdfReports', e.target.checked)}
                    className="mb-3"
                  />
                  <Form.Check
                    type="switch"
                    id="include-address-footer"
                    label="Include address in PDF footer"
                    checked={draft.includeAddressInPdfFooter}
                    onChange={(e) => set('includeAddressInPdfFooter', e.target.checked)}
                    className="mb-3"
                  />
                  <Form.Check
                    type="switch"
                    id="show-motto"
                    label="Show motto/tagline"
                    checked={draft.showMottoTagline}
                    onChange={(e) => set('showMottoTagline', e.target.checked)}
                    className="mb-3"
                  />
                  <Form.Check
                    type="switch"
                    id="multi-campus"
                    label="Enable multi-campus"
                    checked={draft.enableMultiCampus}
                    onChange={(e) => set('enableMultiCampus', e.target.checked)}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Form.Label className="small">Motto / Tagline</Form.Label>
                  <Form.Control
                    value={draft.mottoTagline ?? ''}
                    onChange={(e) => set('mottoTagline', e.target.value)}
                    className="mb-3"
                  />
                  <Row className="g-3">
                    <Col xs={6}>
                      <Form.Label className="small">Default Academic Year</Form.Label>
                      <Form.Control
                        value={draft.defaultAcademicYear ?? ''}
                        onChange={(e) => set('defaultAcademicYear', e.target.value)}
                        placeholder="2026 - 2027"
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Label className="small">Default Language</Form.Label>
                      <Form.Select value={draft.defaultLanguage ?? ''} onChange={(e) => set('defaultLanguage', e.target.value)}>
                        <option value="">Select language</option>
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                  <Form.Label className="small mt-3">Date Format</Form.Label>
                  <Form.Select value={draft.dateFormat ?? ''} onChange={(e) => set('dateFormat', e.target.value)}>
                    <option value="">Select format</option>
                    {DATE_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </>
      )}

      {(activeTab === 'General' || activeTab === 'Reports & Documents') && (
        <div className="d-flex justify-content-end gap-2">
          <Button variant="outline-secondary" onClick={handleReset} disabled={updateMutation.isPending}>
            Reset
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
