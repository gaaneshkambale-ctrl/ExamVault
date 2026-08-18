import { jsPDF } from 'jspdf';
import { getGrade } from '../types/result';
import type { ResultSummaryResponse } from '../types/result';

const LOGO_URL = '/examvault-logo.png';
const LOGO_WATERMARK_OPACITY = 0.08;

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

export async function generateCertificatePdf(result: ResultSummaryResponse, studentName: string): Promise<void> {
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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('EXAMVAULT', centerX, 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(30);
  doc.text('Certificate of Completion', centerX, 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('This certificate is proudly presented to', centerX, 58, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229);
  doc.text(studentName, centerX, 72, { align: 'center' });

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(centerX - 45, 76, centerX + 45, 76);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text('for successfully passing the exam', centerX, 88, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(result.examTitle, centerX, 100, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text(
    `Score: ${result.totalScore} / ${result.totalMarks} (${percentage}%)    Grade: ${grade}`,
    centerX,
    112,
    { align: 'center' },
  );

  doc.setFontSize(10);
  doc.text(`Completed on ${new Date(result.submittedAtUtc).toLocaleDateString()}`, centerX, 120, {
    align: 'center',
  });

  doc.save(`${sanitizeFilename(result.examTitle)}-certificate.pdf`);
}
