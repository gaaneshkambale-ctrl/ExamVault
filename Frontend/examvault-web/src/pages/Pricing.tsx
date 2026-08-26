import { Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const included = [
  'Create unlimited exams with multiple question types',
  'AI-powered question generation',
  'Real-time results and performance analytics',
  'Secure, role-based access for admins and students',
  'Email notifications for exams and results',
];

export default function Pricing() {
  return (
    <div>
      <NavBar />

      <Container className="py-5">
        <div className="text-center mb-5">
          <h1 className="fw-bold">Simple, Transparent Pricing</h1>
          <p className="text-muted fs-5">No hidden fees. No credit card required.</p>
        </div>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={5}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body className="p-5">
                <span className="badge rounded-pill mb-3" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                  Free Forever
                </span>
                <div className="display-4 fw-bold mb-1">$0</div>
                <p className="text-muted mb-4">ExamVault is free to use, for everyone.</p>
                <ul className="list-unstyled text-start mb-4">
                  {included.map((item) => (
                    <li key={item} className="d-flex align-items-start gap-2 mb-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="btn btn-primary btn-lg w-100">
                  Get Started for Free
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Footer />
    </div>
  );
}
