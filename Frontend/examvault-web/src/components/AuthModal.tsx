import type { ReactNode } from 'react';
import { Modal } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';
import BrandMark from './BrandMark';
import { getPlatformBranding } from '../api/platformSettingsApi';

export type AuthMode = 'login' | 'register';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
}

function DotGrid() {
  return (
    <div
      style={{
        width: 60,
        height: 24,
        backgroundImage: 'radial-gradient(circle, #c7d2fe 1.5px, transparent 1.5px)',
        backgroundSize: '12px 12px',
      }}
      aria-hidden="true"
    />
  );
}

function LockIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
      <path
        d="M46 96c6 10 14 16 24 16s18-6 24-16"
        stroke="#c7d2fe"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="46" cy="100" r="16" fill="#818cf8" opacity="0.9" />
      <path d="M38 100l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="58" y="60" width="52" height="46" rx="10" fill="#818cf8" />
      <path d="M70 60V46a14 14 0 0128 0v14" stroke="#a5b4fc" strokeWidth="8" fill="none" />
      <circle cx="84" cy="82" r="7" fill="white" />
      <rect x="81" y="86" width="6" height="12" rx="3" fill="white" />
    </svg>
  );
}

function ClipboardIllustration() {
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" fill="none" aria-hidden="true">
      <ellipse cx="75" cy="138" rx="46" ry="6" fill="#c7d2fe" opacity="0.5" />
      <rect x="20" y="118" width="6" height="20" rx="3" fill="#a7f3d0" />
      <circle cx="23" cy="112" r="12" fill="#6ee7b7" />
      <rect x="48" y="24" width="64" height="98" rx="10" fill="white" stroke="#c7d2fe" strokeWidth="2" />
      <rect x="66" y="16" width="28" height="16" rx="4" fill="#818cf8" />
      <circle cx="80" cy="52" r="12" fill="#e0e7ff" />
      <path d="M74 52a6 6 0 1112 0" stroke="#818cf8" strokeWidth="2.4" fill="none" />
      <rect x="62" y="72" width="36" height="6" rx="3" fill="#e0e7ff" />
      <rect x="62" y="84" width="36" height="6" rx="3" fill="#e0e7ff" />
      <rect x="62" y="96" width="24" height="6" rx="3" fill="#e0e7ff" />
      <path d="M32 96l16 20-30 14z" fill="#818cf8" />
      <path d="M32 96l16 20-30 14z" fill="url(#shieldGrad)" opacity="0.95" />
      <path d="M22 108l6 6 12-12" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <defs>
        <linearGradient id="shieldGrad" x1="18" y1="96" x2="48" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AuthPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="d-none d-md-flex flex-column justify-content-between p-4"
      style={{
        width: '42%',
        background: 'linear-gradient(180deg, #eef2ff, #f5f3ff)',
        borderTopLeftRadius: 'var(--bs-border-radius-lg)',
        borderBottomLeftRadius: 'var(--bs-border-radius-lg)',
      }}
    >
      {children}
    </div>
  );
}

function AuthShell({ panel, onClose, children }: { panel: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="d-flex" style={{ minHeight: 480 }}>
      {panel}
      <div className="flex-grow-1 p-4 position-relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="btn-close position-absolute"
          style={{ top: 20, right: 20 }}
        />
        {children}
      </div>
    </div>
  );
}

export default function AuthModal({ mode, onClose }: AuthModalProps) {
  // Real Platform Settings > General "Platform Name"/"Platform Tagline" -
  // the one place this console shows them to someone who hasn't logged in
  // yet. Falls back to the same static copy this modal always had while
  // loading or if no admin has ever set a custom tagline.
  const { data: branding } = useQuery({ queryKey: ['platform-branding'], queryFn: getPlatformBranding });
  const platformName = branding?.platformName || 'ExamVault';
  const tagline = branding?.platformTagline
    ? branding.platformTagline
    : `Join ${platformName} and simplify the way you create, conduct and analyze exams.`;

  if (mode === 'login') {
    return (
      <Modal show onHide={onClose} centered size="lg" contentClassName="p-0 overflow-hidden border-0">
        <AuthShell
          onClose={onClose}
          panel={
            <AuthPanel>
              <DotGrid />
              <div className="text-center">
                <div className="d-flex justify-content-center mb-3">
                  <BrandMark size={64} />
                </div>
                <h4 className="fw-bold mb-2">Welcome Back!</h4>
                <p className="text-muted small">Log in to continue your learning journey.</p>
              </div>
              <div className="d-flex justify-content-center">
                <LockIllustration />
              </div>
            </AuthPanel>
          }
        >
          <LoginForm />
        </AuthShell>
      </Modal>
    );
  }

  return (
    <Modal show onHide={onClose} centered size="lg" contentClassName="p-0 overflow-hidden border-0">
      <AuthShell
        onClose={onClose}
        panel={
          <AuthPanel>
            <DotGrid />
            <div className="text-center">
              <div className="d-flex justify-content-center mb-3">
                <BrandMark variant="full" size={44} />
              </div>
              <h4 className="fw-bold mb-2">
                Create Your <span className="text-primary">Account</span>
              </h4>
              <p className="text-muted small">{tagline}</p>
            </div>
            <div className="d-flex justify-content-center">
              <ClipboardIllustration />
            </div>
          </AuthPanel>
        }
      >
        <h4 className="fw-bold mb-1">Create Account</h4>
        <p className="text-muted small mb-4">Register a new account to get started</p>
        <RegisterForm />
      </AuthShell>
    </Modal>
  );
}
