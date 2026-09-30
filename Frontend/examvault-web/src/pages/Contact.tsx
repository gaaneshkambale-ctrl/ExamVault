import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { sendContactMessage } from '../api/contactApi';
import { extractServerError } from '../utils/apiError';

const SUPPORT_EMAIL = 'support@examvaults.in';

interface FormState {
  name: string;
  email: string;
  message: string;
}

const initialFormState: FormState = { name: '', email: '', message: '' };

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = 'Please enter your name.';
  if (!form.email.trim()) {
    errors.email = 'Please enter your email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!form.message.trim()) errors.message = 'Please enter a message.';
  return errors;
}

export default function Contact() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await sendContactMessage(form);
      setStatus('success');
      setForm(initialFormState);
    } catch (error) {
      setStatus('error');
      setServerError(extractServerError(error));
    }
  };

  return (
    <div>
      <NavBar />

      <Container className="py-5" style={{ maxWidth: 700 }}>
        <div className="text-center mb-5">
          <h1 className="fw-bold">Contact Us</h1>
          <p className="text-muted fs-5">Have a question? We'd love to hear from you.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4 p-md-5">
            {status === 'success' ? (
              <Alert variant="success" className="mb-0 text-center">
                Thanks for reaching out! We've received your message and will contact you soon.
              </Alert>
            ) : (
              <>
                {status === 'error' && <Alert variant="danger">{serverError}</Alert>}
                <Form noValidate onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="contactName">
                        <Form.Label className="fw-medium">Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Your full name"
                          value={form.name}
                          onChange={handleChange('name')}
                          isInvalid={!!fieldErrors.name}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="contactEmail">
                        <Form.Label className="fw-medium">Email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={handleChange('email')}
                          isInvalid={!!fieldErrors.email}
                        />
                        <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-4" controlId="contactMessage">
                    <Form.Label className="fw-medium">Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      placeholder="How can we help?"
                      value={form.message}
                      onChange={handleChange('message')}
                      isInvalid={!!fieldErrors.message}
                    />
                    <Form.Control.Feedback type="invalid">{fieldErrors.message}</Form.Control.Feedback>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </Form>
              </>
            )}

            <hr className="my-4" />
            <p className="text-muted text-center mb-0">
              Prefer email? Reach us directly at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </Card.Body>
        </Card>
      </Container>

      <Footer />
    </div>
  );
}
