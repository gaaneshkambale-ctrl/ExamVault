import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

function BrandIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="2.5" fill="rgba(255,255,255,0.15)" />
      <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="4.5" r="1.4" fill="white" />
    </svg>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light py-4 px-3">
      <div className="shadow-lg rounded-4 overflow-hidden bg-white w-100" style={{ maxWidth: 900 }}>
        <div className="row g-0">
          <div
            className="col-md-5 d-none d-md-flex flex-column align-items-center justify-content-center text-center text-white p-5"
            style={{ background: 'linear-gradient(160deg, #6366f1, #4338ca)' }}
          >
            <BrandIllustration />
            <h2 className="mt-4 fw-bold">ExamVault</h2>
            <p className="text-white-50 mb-0">Smart Online Examination System</p>
          </div>
          <div className="col-md-7 p-4 p-md-5">
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
