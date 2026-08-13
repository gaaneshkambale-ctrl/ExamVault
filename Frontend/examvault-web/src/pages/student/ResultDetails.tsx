import { Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import StudentLayout from '../../layouts/StudentLayout';
import { useMyResult } from '../../hooks/useResults';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={6} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function ResultDetails() {
  const { examId } = useParams<{ examId: string }>();
  const { data: result, isLoading, isError } = useMyResult(examId);

  const percentage =
    result && result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;

  return (
    <StudentLayout active="My Results">
      <Link to="/results" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to My Results
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && (isError || !result) && (
        <div className="text-center text-muted py-5">
          No result available for this exam yet - it may not be submitted.
        </div>
      )}

      {!isLoading && result && (
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
          <Card.Body className="p-4 text-center">
            <div
              className={`rounded-circle bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3 ${
                result.passed ? 'bg-success text-success' : 'bg-danger text-danger'
              }`}
              style={{ width: 64, height: 64, fontSize: 32 }}
            >
              {result.passed ? '✓' : '✗'}
            </div>
            <h1 className="h5 fw-bold mb-1">{result.examTitle}</h1>
            <Badge bg={result.passed ? 'success' : 'danger'} className="mb-4">
              {result.passed ? 'Passed' : 'Failed'}
            </Badge>

            <div className="text-start border rounded-3 p-3">
              <Row>
                <Field label="Score" value={`${result.totalScore} / ${result.totalMarks}`} />
                <Field label="Percentage" value={`${percentage}%`} />
                <Field label="Passing Marks" value={String(result.passingMarks)} />
                <Field label="Submitted On" value={new Date(result.submittedAtUtc).toLocaleString()} />
              </Row>
            </div>
          </Card.Body>
        </Card>
      )}
    </StudentLayout>
  );
}
