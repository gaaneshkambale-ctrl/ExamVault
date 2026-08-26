import { Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const audiences = [
  {
    title: 'For Institutions',
    description: 'Schools, colleges and universities can conduct exams securely and efficiently.',
  },
  {
    title: 'For Educators',
    description: 'Create assessments, track performance and improve learning outcomes.',
  },
  {
    title: 'For Students',
    description: 'Take exams, view results and track your progress in one place.',
  },
];

export default function About() {
  return (
    <div>
      <NavBar />

      <Container className="py-5" style={{ maxWidth: 860 }}>
        <div className="text-center mb-5">
          <h1 className="fw-bold">About ExamVault</h1>
          <p className="text-muted fs-5">
            A secure and intelligent online examination platform for institutions, educators and
            learners.
          </p>
        </div>

        <Card className="border-0 shadow-sm mb-5">
          <Card.Body className="p-4 p-md-5">
            <h2 className="h5 fw-bold mb-3">Our Mission</h2>
            <p className="text-muted mb-0">
              ExamVault exists to make creating, conducting and evaluating exams simple and
              trustworthy. From AI-assisted question generation to instant, detailed results,
              every part of the platform is built to save educators time and give students clear,
              fast feedback on how they're doing.
            </p>
          </Card.Body>
        </Card>

        <Row className="g-4 mb-5">
          {audiences.map((audience) => (
            <Col key={audience.title} md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <Card.Title as="h6" className="fw-bold">
                    {audience.title}
                  </Card.Title>
                  <Card.Text className="text-muted small mb-0">{audience.description}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="text-center">
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started for Free
          </Link>
        </div>
      </Container>

      <Footer />
    </div>
  );
}
