import { Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useExams } from '../../hooks/useExams';
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

export default function ManageExams() {
  const { data: exams, isLoading, isError } = useExams();

  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Exams</h1>
        <Link to="/admin/exams/create" className="btn btn-primary">
          + Create Exam
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || exams?.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load exams. Please try again.
            </div>
          )}

          {!isLoading && !isError && exams?.length === 0 && (
            <div className="text-center text-muted py-5">
              No exams yet. Click "+ Create Exam" to add one.
            </div>
          )}

          {!isLoading && !isError && exams && exams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Title</th>
                  <th>Type</th>
                  <th>Total Questions</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="ps-4 fw-medium">{exam.title}</td>
                    <td>{examTypeLabel[exam.examType]}</td>
                    <td>{exam.totalQuestions}</td>
                    <td>{exam.durationMinutes} min</td>
                    <td>{exam.totalMarks}</td>
                    <td>
                      <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                    </td>
                    <td>{new Date(exam.createdOn).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <Link to={`/admin/exams/${exam.id}`} className="me-3">
                        View
                      </Link>
                      <Button variant="link" size="sm" disabled className="text-muted p-0">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
