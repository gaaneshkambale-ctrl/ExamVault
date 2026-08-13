import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { useExam } from '../../hooks/useExams';

type NavState = 'answered' | 'not-answered' | 'marked' | 'not-visited';

const NAV_LEGEND: Array<{ state: NavState; label: string; color: string }> = [
  { state: 'answered', label: 'Answered', color: '#16a34a' },
  { state: 'not-answered', label: 'Not Answered', color: '#dc3545' },
  { state: 'marked', label: 'Marked for Review', color: '#f59e0b' },
  { state: 'not-visited', label: 'Not Visited', color: '#e5e7eb' },
];

const navStateStyle: Record<NavState, { background: string; color: string }> = {
  answered: { background: '#16a34a', color: 'white' },
  'not-answered': { background: 'white', color: '#212529' },
  marked: { background: '#f59e0b', color: 'white' },
  'not-visited': { background: '#e5e7eb', color: '#6c757d' },
};

export default function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const { data: exam, isLoading } = useExam(id);
  const totalQuestions = exam?.totalQuestions && exam.totalQuestions > 0 ? exam.totalQuestions : 10;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedForReview, setMarkedForReview] = useState(false);
  const [showSubmitInfo, setShowSubmitInfo] = useState(false);

  const navState = (index: number): NavState => {
    if (index === currentIndex) {
      return markedForReview ? 'marked' : 'not-answered';
    }
    return 'not-visited';
  };

  return (
    <StudentLayout active="My Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h5 fw-bold mb-0">{isLoading ? <Spinner animation="border" size="sm" /> : exam?.title ?? 'Take Exam'}</h1>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-center">
            <div className="text-muted small">Time Left</div>
            <div className="fw-bold">00:{String(exam?.durationMinutes ?? 0).padStart(2, '0')}:00</div>
          </div>
          <Button variant="danger" onClick={() => setShowSubmitInfo(true)}>
            Submit Exam
          </Button>
        </div>
      </div>

      {showSubmitInfo && (
        <Alert variant="info" onClose={() => setShowSubmitInfo(false)} dismissible>
          Submitting isn't connected yet — attempt persistence and answer saving are Day 32/33's job.
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Question Navigator</h2>
              <div className="d-flex flex-wrap gap-2 mb-4">
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className="border rounded-2 fw-medium"
                    style={{
                      width: 34,
                      height: 34,
                      ...navStateStyle[navState(i)],
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="d-flex flex-column gap-2">
                {NAV_LEGEND.map((item) => (
                  <div key={item.state} className="d-flex align-items-center gap-2 small">
                    <span
                      className="rounded-1 border flex-shrink-0"
                      style={{ width: 14, height: 14, background: item.color }}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <Form.Check
                  type="checkbox"
                  label="Mark for Review"
                  checked={markedForReview}
                  onChange={(e) => setMarkedForReview(e.target.checked)}
                />
              </div>

              <p className="fw-medium mb-4">
                Question content will load here once exam questions are wired up (Day 32).
              </p>

              <Form>
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <Form.Check
                    key={letter}
                    type="radio"
                    name="take-exam-option"
                    id={`option-${letter}`}
                    disabled
                    label={`${letter}: Option placeholder`}
                    className="mb-2"
                  />
                ))}
              </Form>

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="outline-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  &larr; Previous
                </Button>
                <Button
                  variant="primary"
                  disabled={currentIndex === totalQuestions - 1}
                  onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                >
                  Next &rarr;
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </StudentLayout>
  );
}
