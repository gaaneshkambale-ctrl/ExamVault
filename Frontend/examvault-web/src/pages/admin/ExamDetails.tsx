import { Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExam } from '../../hooks/useExams';
import type { ExamStatus, ExamType } from '../../types/exam';

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: exam, isLoading, isError } = useExam(id);

  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Exam Details</h1>
        <Link to="/admin/exams" className="btn btn-outline-secondary">
          Back to Exams
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this exam. It may not exist.
            </div>
          )}

          {exam && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h2 className="h5 fw-bold mb-1">{exam.title}</h2>
                  <p className="text-muted mb-0">{exam.description || 'No description.'}</p>
                </div>
                <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
              </div>

              <Row>
                <Field label="Exam Type" value={examTypeLabel[exam.examType]} />
                <Field label="Duration" value={`${exam.durationMinutes} minutes`} />
                <Field label="Total Marks" value={String(exam.totalMarks)} />
                <Field label="Passing Marks" value={String(exam.passingMarks)} />
                <Field label="Total Questions" value={String(exam.totalQuestions)} />
                <Field
                  label="Created On"
                  value={new Date(exam.createdOn).toLocaleString()}
                />
              </Row>

              <div className="text-muted small mb-1">Instructions</div>
              <div>{exam.instructions || 'No instructions provided.'}</div>
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
