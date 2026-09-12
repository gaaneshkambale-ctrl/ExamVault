import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { jsPDF } from 'jspdf';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
  useUploadOrganizationAsset,
  useRemoveOrganizationAsset,
} from '../../hooks/useOrganizationSettings';
import { fetchOrganizationAssetObjectUrl } from '../../api/organizationSettingsApi';
import { extractServerError } from '../../utils/apiError';
import { ORGANIZATION_TYPES } from '../../types/tenant';
import {
  MARGIN,
  CONTENT_WIDTH,
  PAGE_WIDTH,
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

const TABS = ['General', 'Branding & Assets', 'PDF Report Settings', 'Email Settings', 'Security & Compliance'] as const;
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

  const handleDownloadSample = async () => {
    const doc = new jsPDF();
    const brand = draft.useBrandColorsInReportHeader ? hexToRgb(draft.primaryColor) : TEXT_DARK;
    const passed = percentage >= 40;
    const grade = percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C';

    const [logoImg, signatureImg] = await Promise.all([loadImageElement(logoUrl), loadImageElement(signatureUrl)]);

    // Header: logo + name/motto on the left, contact block on the right.
    if (logoImg) {
      doc.addImage(logoImg, MARGIN, MARGIN, 16, 16);
    } else {
      setColor(doc, 'setFillColor', brand);
      doc.roundedRect(MARGIN, MARGIN, 16, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text((draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase(), MARGIN + 8, MARGIN + 10, {
        align: 'center',
      });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, 'setTextColor', brand);
    doc.text(draft.name || 'Institution Name', MARGIN + 20, MARGIN + 6);
    if (draft.showMottoTagline && draft.mottoTagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text(draft.mottoTagline, MARGIN + 20, MARGIN + 12);
    }
    if (draft.showContactDetails) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      const address = [draft.addressLine1, draft.city, draft.state, draft.postalCode, draft.country]
        .filter(Boolean)
        .join(', ');
      const contact = [draft.contactPhone, draft.website].filter(Boolean).join(' · ');
      doc.text(fitText(doc, address, 90), PAGE_WIDTH - MARGIN, MARGIN + 4, { align: 'right' });
      doc.text(fitText(doc, contact, 90), PAGE_WIDTH - MARGIN, MARGIN + 9, { align: 'right' });
    }
    setColor(doc, 'setDrawColor', brand);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, MARGIN + 22, PAGE_WIDTH - MARGIN, MARGIN + 22);

    let y = MARGIN + 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setColor(doc, 'setTextColor', TEXT_DARK);
    doc.text('OFFICIAL EXAMINATION REPORT', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 10;

    const fields: [string, string][] = [
      ['Student Name', SAMPLE_REPORT.studentName],
      ['Registration No.', SAMPLE_REPORT.registrationNo],
      ['Program', SAMPLE_REPORT.program],
      ['Exam Name', SAMPLE_REPORT.examName],
      ['Exam Date', SAMPLE_REPORT.examDate],
      ['Duration', SAMPLE_REPORT.duration],
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
    SAMPLE_REPORT.rows.forEach((r, i) => {
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
    doc.text(String(totalMarks), MARGIN + colWidths[0] + colWidths[1] + 2, y + rowH - 2.5);
    doc.text(String(totalObtained), MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + rowH - 2.5);
    y += rowH;
    setColor(doc, 'setDrawColor', BORDER);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, tableTop, CONTENT_WIDTH, y - tableTop);
    y += 10;

    const cardW = (CONTENT_WIDTH - 12) / 3;
    drawStatCard(doc, MARGIN, y, cardW, 26, brand, 'Percentage', `${percentage}%`, brand);
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
    drawStatCard(doc, MARGIN + (cardW + 6) * 2, y, cardW, 26, brand, 'Grade', grade, brand);
    y += 26 + 10;

    if (draft.showQrCodeForVerification) {
      drawQrPlaceholder(doc, MARGIN, y, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, 'setTextColor', TEXT_MUTED);
      doc.text('Scan to verify this report', MARGIN + 26, y + 8);
      doc.text(`Verification Code: ${SAMPLE_REPORT.verificationCode}`, MARGIN + 26, y + 13);
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
    doc.text('(Sample)', PAGE_WIDTH - MARGIN, y, { align: 'right' });

    doc.save('sample-report.pdf');
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
                subtitle="See how your settings will appear in the generated report."
                action={
                  <Button variant="outline-primary" size="sm" onClick={handleDownloadSample}>
                    Download Sample
                  </Button>
                }
              />
              <Card className="border">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-2 overflow-hidden flex-shrink-0"
                        style={{ width: 44, height: 44, background: headerColor, color: 'white', fontWeight: 700 }}
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="fw-bold" style={{ color: headerColor }}>
                          {draft.name || 'Institution Name'}
                        </div>
                        {draft.showMottoTagline && draft.mottoTagline && (
                          <div className="text-muted small">{draft.mottoTagline}</div>
                        )}
                      </div>
                    </div>
                    {draft.showContactDetails && (
                      <div className="text-end text-muted small">
                        {[draft.addressLine1, draft.city, draft.state, draft.postalCode, draft.country]
                          .filter(Boolean)
                          .join(', ')}
                        <div>{[draft.contactPhone, draft.contactEmail, draft.website].filter(Boolean).join(' · ')}</div>
                      </div>
                    )}
                  </div>

                  <h6 className="text-center fw-bold mb-3">OFFICIAL EXAMINATION REPORT</h6>

                  <Row className="g-1 small mb-3">
                    <Col xs={6}>
                      <strong>Student Name:</strong> {SAMPLE_REPORT.studentName}
                    </Col>
                    <Col xs={6}>
                      <strong>Registration No.:</strong> {SAMPLE_REPORT.registrationNo}
                    </Col>
                    <Col xs={6}>
                      <strong>Program:</strong> {SAMPLE_REPORT.program}
                    </Col>
                    <Col xs={6}>
                      <strong>Exam Name:</strong> {SAMPLE_REPORT.examName}
                    </Col>
                    <Col xs={6}>
                      <strong>Exam Date:</strong> {SAMPLE_REPORT.examDate}
                    </Col>
                    <Col xs={6}>
                      <strong>Duration:</strong> {SAMPLE_REPORT.duration}
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

                  {draft.showMottoTagline && draft.mottoTagline && (
                    <div className="text-muted small border-top pt-2 mt-2">{draft.mottoTagline}</div>
                  )}
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

export default function OrganizationSettingsPage() {
  const { data: settings, isLoading, isError } = useOrganizationSettings();
  const updateMutation = useUpdateOrganizationSettings();
  const uploadAssetMutation = useUploadOrganizationAsset();
  const removeAssetMutation = useRemoveOrganizationAsset();

  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [draft, setDraft] = useState<UpdateOrganizationSettingsRequest | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft(toDraft(settings));
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
          <Badge bg="success-subtle" text="success-emphasis" className="fw-normal mb-1">
            ● Active
          </Badge>
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

      {activeTab === 'PDF Report Settings' ? (
        <PdfReportSettingsTab draft={draft} set={set} logoUrl={logoUrl} signatureUrl={signatureUrl} />
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
                      <Form.Control value={draft.name} onChange={(e) => set('name', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Short Name / Abbreviation</Form.Label>
                      <Form.Control value={draft.shortName ?? ''} onChange={(e) => set('shortName', e.target.value)} />
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Label className="small">Institution Type</Form.Label>
                      <Form.Select
                        value={draft.organizationType ?? ''}
                        onChange={(e) => set('organizationType', e.target.value)}
                      >
                        <option value="">Select type</option>
                        {ORGANIZATION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Form.Select>
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
                      style={{ width: 64, height: 64 }}
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
              <Card className="border-0 shadow-sm h-100" style={{ background: '#eef2ff' }}>
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
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-2 overflow-hidden flex-shrink-0"
                            style={{
                              width: 40,
                              height: 40,
                              background: draft.primaryColor ?? DEFAULT_BRANDING_COLORS.primaryColor,
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {logoUrl ? (
                              <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (draft.shortName || draft.name || 'EV').slice(0, 3).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="fw-bold" style={{ color: draft.primaryColor ?? undefined }}>
                              {draft.name || 'Institution Name'}
                            </div>
                            {draft.showMottoTagline && draft.mottoTagline && (
                              <div className="text-muted small">{draft.mottoTagline}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold small">OFFICIAL REPORT</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            Assessment | Evaluation | Excellence
                          </div>
                        </div>
                      </div>
                      {draft.includeAddressInPdfFooter && (
                        <div className="text-muted small border-top pt-2">
                          {[draft.addressLine1, draft.city, draft.state, draft.postalCode, draft.country]
                            .filter(Boolean)
                            .join(', ') || 'Address will appear here'}
                          {(draft.contactPhone || draft.contactEmail || draft.website) && (
                            <div>
                              {[draft.contactPhone, draft.contactEmail, draft.website].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      )}
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

      {(activeTab === 'General' || activeTab === 'PDF Report Settings') && (
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
