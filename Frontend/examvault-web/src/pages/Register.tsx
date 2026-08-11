import { useState } from 'react';
import { Form } from 'react-bootstrap';
import type { RegisterRequest } from '../types/user';

export default function Register() {
  const [formData, setFormData] = useState<RegisterRequest>({
    fullName: '',
    email: '',
    password: '',
  });

  const handleChange =
    (field: keyof RegisterRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1>Register</h1>
      <p className="text-muted">
        Form fields only for now — validation and submission are wired up in Phase 1, Day 7.
      </p>
      <Form>
        <Form.Group className="mb-3" controlId="registerFullName">
          <Form.Label>Full Name</Form.Label>
          <Form.Control type="text" value={formData.fullName} onChange={handleChange('fullName')} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" value={formData.email} onChange={handleChange('email')} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
          />
        </Form.Group>
      </Form>
    </div>
  );
}
