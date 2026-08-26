import { getGrade } from '../../types/result';
import type { ResultSummaryResponse } from '../../types/result';

interface CertificatePreviewProps {
  result: ResultSummaryResponse;
  candidateName: string;
  certificateId: string;
  qrDataUrl: string | null;
}

function MarksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" strokeLinejoin="round" />
      <path d="M9 10h6M9 14h6M9 18h3" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

export default function CertificatePreview({ result, candidateName, certificateId, qrDataUrl }: CertificatePreviewProps) {
  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);

  return (
    <div
      className="position-relative mx-auto p-4 p-md-5"
      style={{
        maxWidth: 820,
        background: '#fff',
        border: '2px solid #4f46e5',
        borderRadius: 12,
        boxShadow: 'inset 0 0 0 6px #fff, inset 0 0 0 8px #e0e7ff',
      }}
    >
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: 'url(/examvault-logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: '55%',
          opacity: 0.06,
          pointerEvents: 'none',
        }}
      />

      <div className="position-relative text-center">
        <div className="d-flex justify-content-center mb-2">
          <img src="/examvault-logo-wordmark.png" alt="ExamVault" style={{ height: 32, width: 'auto' }} />
        </div>

        <h1 className="fw-bold mb-4" style={{ fontSize: '1.75rem', color: '#1e1b4b' }}>
          Certificate of Achievement
        </h1>

        <p className="text-muted mb-1">This is proudly presented to</p>
        <p className="fw-bold mb-3" style={{ fontSize: '2rem', fontStyle: 'italic', color: '#4f46e5' }}>
          {candidateName}
        </p>

        <p className="text-muted mb-1">for successfully completing the exam</p>
        <p className="fw-bold h4 mb-3">{result.examTitle}</p>

        <p className="text-muted mb-1">and securing</p>
        <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
          <span className="fw-bold" style={{ fontSize: '2.25rem', color: '#4f46e5' }}>
            {percentage}%
          </span>
          <span className="badge bg-primary py-2 px-3" style={{ fontSize: '0.9rem' }}>
            Grade: {grade}
          </span>
        </div>

        <div className="d-flex justify-content-center gap-5 mb-4 flex-wrap">
          <div className="text-center">
            <MarksIcon />
            <div className="text-muted small mt-1">Total Marks</div>
            <div className="fw-bold">{result.totalMarks}</div>
          </div>
          <div className="text-center">
            <MarksIcon />
            <div className="text-muted small mt-1">Obtained Marks</div>
            <div className="fw-bold">{result.totalScore}</div>
          </div>
          <div className="text-center">
            <CalendarIcon />
            <div className="text-muted small mt-1">Completed On</div>
            <div className="fw-bold">{new Date(result.submittedAtUtc).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-end mt-5 pt-3 border-top">
          <div className="text-start">
            <div className="fw-bold" style={{ fontStyle: 'italic' }}>
              ExamVault
            </div>
            <div className="text-muted small">Director</div>
          </div>
          {qrDataUrl && <img src={qrDataUrl} alt="Certificate QR code" width={64} height={64} />}
        </div>

        <div className="text-muted small mt-3">Certificate ID: {certificateId}</div>
      </div>
    </div>
  );
}
