import { Modal } from 'react-bootstrap';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';
import BrandMark from './BrandMark';

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

function LoginPanel() {
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
    </div>
  );
}

export default function AuthModal({ mode, onClose }: AuthModalProps) {
  if (mode === 'login') {
    return (
      <Modal show onHide={onClose} centered size="lg" contentClassName="p-0 overflow-hidden border-0">
        <div className="d-flex" style={{ minHeight: 480 }}>
          <LoginPanel />
          <div className="flex-grow-1 p-4 position-relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn-close position-absolute"
              style={{ top: 20, right: 20 }}
            />
            <LoginForm />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Account</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-4">Register a new account</p>
        <RegisterForm />
      </Modal.Body>
    </Modal>
  );
}
