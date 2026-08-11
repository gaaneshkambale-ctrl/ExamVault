import type { ReactNode } from 'react';
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
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light py-4 px-3">
      <div className="shadow-lg rounded-4 bg-white w-100" style={{ maxWidth: 900 }}>
        <div className="p-4 pb-0">
          <Link to="/" className="d-inline-flex align-items-center gap-2 fw-bold text-decoration-none text-dark">
            <BrandMark />
            ExamVault
          </Link>
        </div>
        <div className="row g-0">
          <div className="col-md-5 d-none d-md-flex align-items-center justify-content-center p-5">
            {illustration}
          </div>
          <div className="col-md-7 p-4 p-md-5 pt-3">
            <h1 className="h3 fw-bold mb-1">{title}</h1>
            <p className="text-muted mb-4">{subtitle}</p>
            {children}
            {footer && <div className="mt-4 text-center">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
