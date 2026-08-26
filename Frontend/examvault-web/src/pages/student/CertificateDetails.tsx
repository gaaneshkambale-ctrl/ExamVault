import { useEffect, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import StudentLayout from '../../layouts/StudentLayout';
import { useMyResult } from '../../hooks/useResults';
import { useAuth } from '../../hooks/useAuth';
import { getGrade } from '../../types/result';
import CertificatePreview from '../../components/certificate/CertificatePreview';
import { getCertificateId, isCertificateEligible } from '../../utils/certificateId';
import { generateCertificatePdf, getCertificatePdfFile } from '../../utils/generateCertificatePdf';

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

export default function CertificateDetails() {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const { data: result, isLoading, isError } = useMyResult(examId);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const certificateId = result ? getCertificateId(result) : null;
  const certificateUrl = examId ? `${window.location.origin}/certificates/${examId}` : '';

  useEffect(() => {
    if (!certificateUrl) {
      return;
    }
    QRCode.toDataURL(certificateUrl, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [certificateUrl]);

  const handleDownload = async () => {
    if (!result || !user || !certificateId) {
      return;
    }
    setIsDownloading(true);
    try {
      await generateCertificatePdf(result, user.fullName, { certificateId, qrDataUrl });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!result || !user || !certificateId) {
      return;
    }
    setShareMessage(null);
    setIsSharing(true);
    try {
      const file = await getCertificatePdfFile(result, user.fullName, { certificateId, qrDataUrl });
      const canShareFiles = navigator.canShare?.({ files: [file] });
      if (navigator.share && canShareFiles) {
        await navigator.share({
          title: `Certificate - ${result.examTitle}`,
          text: `My ExamVault certificate for ${result.examTitle}`,
          files: [file],
        });
      } else {
        setShareMessage({
          variant: 'danger',
          text: "Sharing isn't supported in this browser. Use Download instead.",
        });
      }
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') {
        setShareMessage({ variant: 'danger', text: 'Could not share the certificate. Please try downloading it.' });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <StudentLayout active="My Certificates">
      <Breadcrumb className="d-print-none">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/certificates' }}>
          My Certificates
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Certificate Details</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <h1 className="h4 fw-bold mb-0">My Certificates</h1>
        <Link to="/certificates" className="btn btn-outline-secondary btn-sm">
          &larr; Back to Certificates
        </Link>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center text-danger py-5">Couldn't load this certificate. Please try again.</div>
      )}

      {!isLoading && !isError && (!result || !isCertificateEligible(result)) && (
        <div className="text-center text-muted py-5">
          No certificate is available for this exam - it requires a score of 80% or above.
        </div>
      )}

      {!isLoading && result && isCertificateEligible(result) && user && certificateId && (
        <Row className="g-4">
          <Col lg={4} className="d-print-none">
            <Card className="border-0 shadow-sm mb-3">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-3">Certificate Details</h2>
                <dl className="mb-0 small">
                  {[
                    ['Certificate ID', certificateId],
                    ['Exam Title', result.examTitle],
                    ['Score', `${result.totalScore}/${result.totalMarks}`],
                    ['Grade', getGrade(result.totalScore, result.totalMarks, result.passed)],
                    ['Total Marks', result.totalMarks],
                    ['Obtained Marks', result.totalScore],
                    ['Completed On', new Date(result.submittedAtUtc).toLocaleString()],
                    ['Candidate Name', user.fullName],
                    ['Date of Issue', new Date(result.submittedAtUtc).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <Row key={label} className="py-1 border-bottom">
                      <Col xs={6} className="text-muted">
                        {label}
                      </Col>
                      <Col xs={6} className="fw-medium text-end text-sm-start">
                        {label === 'Grade' ? (
                          <span className={`badge bg-${gradeVariant[String(value)]}`}>{value}</span>
                        ) : (
                          value
                        )}
                      </Col>
                    </Row>
                  ))}
                </dl>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-3">
              <Card.Body className="p-4">
                <h2 className="h6 fw-bold mb-2">Certificate Access</h2>
                <p className="text-muted small mb-3">Scan the QR code or use the link below to open this certificate anytime.</p>
                {qrDataUrl && <img src={qrDataUrl} alt="Certificate QR code" className="mb-2" />}
                <div>
                  <Link to={`/certificates/${examId}`} className="small text-break">
                    {certificateUrl}
                  </Link>
                </div>
              </Card.Body>
            </Card>

            {shareMessage && (
              <Alert variant={shareMessage.variant} className="py-2 small">
                {shareMessage.text}
              </Alert>
            )}

            <div className="d-grid gap-2">
              <Button variant="primary" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? 'Preparing...' : 'Download Certificate (PDF)'}
              </Button>
              <Button variant="outline-secondary" onClick={handleShare} disabled={isSharing}>
                {isSharing ? 'Preparing...' : 'Share Certificate'}
              </Button>
              <Button variant="outline-secondary" onClick={handlePrint}>
                Print Certificate
              </Button>
            </div>
          </Col>

          <Col lg={8}>
            <CertificatePreview
              result={result}
              candidateName={user.fullName}
              certificateId={certificateId}
              qrDataUrl={qrDataUrl}
            />
            <p className="text-muted small text-center mt-3 d-print-none">
              This certificate is digitally generated and does not require a physical signature.
            </p>
          </Col>
        </Row>
      )}
    </StudentLayout>
  );
}
