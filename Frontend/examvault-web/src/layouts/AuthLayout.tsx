import type { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  illustration: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  illustration,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      <div className="p-4">
        <Link
          to="/"
          className="d-inline-flex align-items-center gap-2 fw-bold text-decoration-none text-dark"
        >
          <BrandMark />
          ExamVault
        </Link>
      </div>

      <Container className="d-flex flex-column flex-grow-1">
        <div className="row g-0 flex-grow-1 align-items-center">
          <div className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center py-5">
            {illustration}
          </div>
          <div className="col-lg-6 d-flex justify-content-center px-3">
            <div className="w-100 py-5" style={{ maxWidth: 440 }}>
              <h1 className="h3 fw-bold mb-1">{title}</h1>
              <p className="text-muted mb-4">{subtitle}</p>
              {children}
              {footer && <div className="mt-4 text-center">{footer}</div>}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
