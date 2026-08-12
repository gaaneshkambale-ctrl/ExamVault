import { Modal } from 'react-bootstrap';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';

export type AuthMode = 'login' | 'register';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
}

export default function AuthModal({ mode, onClose }: AuthModalProps) {
  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'login' ? 'Welcome Back!' : 'Create Account'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-4">
          {mode === 'login' ? 'Login to your account' : 'Register a new account'}
        </p>
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}
      </Modal.Body>
    </Modal>
  );
}
