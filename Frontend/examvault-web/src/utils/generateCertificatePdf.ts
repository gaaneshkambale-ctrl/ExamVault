import { jsPDF } from 'jspdf';
import { getGrade } from '../types/result';
import type { ResultSummaryResponse } from '../types/result';

const LOGO_URL = '/examvault-logo.png';
const WORDMARK_URL = '/examvault-logo-wordmark.png';
const LOGO_WATERMARK_OPACITY = 0.08;

export interface CertificateExtras {
  certificateId?: string;
  qrDataUrl?: string | null;
}

function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

// Loads the site logo and re-renders it onto a canvas at low alpha, so it can
// be dropped into the PDF as a faded background watermark rather than a full-
// strength image sitting on top of (and fighting with) the certificate text.
function loadFadedLogo(): Promise<{ dataUrl: string; aspectRatio: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.globalAlpha = LOGO_WATERMARK_OPACITY;
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), aspectRatio: img.naturalWidth / img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

const WORDMARK_MAX_WIDTH_PX = 500;

// Full-opacity load (via canvas, same as loadFadedLogo, so jsPDF always gets
// a data URL rather than a bare path) - used for the header wordmark. The
// source file is a high-res 1944x542 export; the PDF only ever shows it at a
// few millimeters tall, so it's downscaled here first - embedding it at full
// resolution would balloon the PDF to several megabytes for no visible gain.
function loadWordmark(): Promise<{ dataUrl: string; aspectRatio: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const scale = Math.min(1, WORDMARK_MAX_WIDTH_PX / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), aspectRatio });
    };
    img.onerror = () => resolve(null);
    img.src = WORDMARK_URL;
  });
}

// Shared by the download button and the share button - built once as a jsPDF
// document, then either saved straight to disk or turned into a Blob to hand
// to the Web Share API.
export async function buildCertificatePdf(
  result: ResultSummaryResponse,
  studentName: string,
  extras: CertificateExtras = {},
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const centerX = width / 2;
  const centerY = height / 2;

  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);

  // Watermark first, so every other layer below draws on top of it. Never
  // lets a logo-loading hiccup block the certificate itself.
  const logo = await loadFadedLogo().catch(() => null);
  if (logo) {
    const logoWidth = width * 0.6;
    const logoHeight = logoWidth / logo.aspectRatio;
    doc.addImage(logo.dataUrl, 'PNG', centerX - logoWidth / 2, centerY - logoHeight / 2, logoWidth, logoHeight);
  }

  // Decorative border.
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, width - 16, height - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, width - 22, height - 22);

  const wordmark = await loadWordmark().catch(() => null);
  if (wordmark) {
    const wordmarkHeight = 12;
    const wordmarkWidth = wordmarkHeight * wordmark.aspectRatio;
    doc.addImage(wordmark.dataUrl, 'PNG', centerX - wordmarkWidth / 2, 14, wordmarkWidth, wordmarkHeight);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(90);
    doc.text('EXAMVAULT', centerX, 26, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30);
  doc.text('Certificate of Achievement', centerX, 39, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('This is proudly presented to', centerX, 54, { align: 'center' });

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229);
  doc.text(studentName, centerX, 68, { align: 'center' });

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(centerX - 45, 72, centerX + 45, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('for successfully completing the exam', centerX, 84, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(result.examTitle, centerX, 96, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('and securing', centerX, 106, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text(`${percentage}%  ·  Grade ${grade}`, centerX, 118, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(
    `Total Marks: ${result.totalMarks}      Obtained Marks: ${result.totalScore}      Completed On: ${new Date(
      result.submittedAtUtc,
    ).toLocaleDateString()}`,
    centerX,
    130,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text('ExamVault', 20, height - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Director', 20, height - 13);

  if (extras.qrDataUrl) {
    doc.addImage(extras.qrDataUrl, 'PNG', width - 38, height - 34, 18, 18);
  }

  if (extras.certificateId) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Certificate ID: ${extras.certificateId}`, centerX, height - 13, { align: 'center' });
  }

  return doc;
}

export async function generateCertificatePdf(
  result: ResultSummaryResponse,
  studentName: string,
  extras: CertificateExtras = {},
): Promise<void> {
  const doc = await buildCertificatePdf(result, studentName, extras);
  doc.save(`${sanitizeFilename(result.examTitle)}-certificate.pdf`);
}

export async function getCertificatePdfFile(
  result: ResultSummaryResponse,
  studentName: string,
  extras: CertificateExtras = {},
): Promise<File> {
  const doc = await buildCertificatePdf(result, studentName, extras);
  const blob = doc.output('blob');
  return new File([blob], `${sanitizeFilename(result.examTitle)}-certificate.pdf`, { type: 'application/pdf' });
}
