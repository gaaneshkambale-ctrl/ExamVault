import { Card, Col, Container, Row } from 'react-bootstrap';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const SUPPORT_EMAIL = 'ganesh.kamble222@gmail.com';

export default function Contact() {
  return (
    <div>
      <NavBar />

      <Container className="py-5" style={{ maxWidth: 700 }}>
        <div className="text-center mb-5">
          <h1 className="fw-bold">Contact Us</h1>
          <p className="text-muted fs-5">Have a question? We'd love to hear from you.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4 p-md-5 text-center">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{ width: 56, height: 56, background: '#eef2ff' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </span>
            <h2 className="h5 fw-bold mb-2">Email Us</h2>
            <p className="text-muted mb-4">
              For questions, feedback, or support, reach out and we'll get back to you.
            </p>
            <Row className="justify-content-center">
              <Col xs="auto">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary btn-lg">
                  {SUPPORT_EMAIL}
                </a>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>

      <Footer />
    </div>
  );
}
