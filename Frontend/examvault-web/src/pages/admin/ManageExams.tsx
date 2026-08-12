import { Badge, Button, Card, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';

interface ExamRow {
  id: string;
  title: string;
  type: 'Manual' | 'AI Generated';
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  status: 'Draft' | 'Published' | 'Archived';
  createdOn: string;
}

const mockExams: ExamRow[] = [
  {
    id: '1',
    title: 'C# Fundamentals',
    type: 'Manual',
    totalQuestions: 50,
    durationMinutes: 60,
    totalMarks: 50,
    status: 'Published',
    createdOn: '2026-05-25',
  },
  {
    id: '2',
    title: 'ASP.NET Core',
    type: 'Manual',
    totalQuestions: 60,
    durationMinutes: 90,
    totalMarks: 60,
    status: 'Published',
    createdOn: '2026-05-24',
  },
  {
    id: '3',
    title: 'Database Basics',
    type: 'Manual',
    totalQuestions: 40,
    durationMinutes: 45,
    totalMarks: 40,
    status: 'Draft',
    createdOn: '2026-05-23',
  },
];

const statusVariant: Record<ExamRow['status'], string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

export default function ManageExams() {
  return (
    <AdminLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Exams</h1>
        <Link to="/admin/exams/create" className="btn btn-primary">
          + Create Exam
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
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
              {mockExams.map((exam) => (
                <tr key={exam.id}>
                  <td className="ps-4 fw-medium">{exam.title}</td>
                  <td>{exam.type}</td>
                  <td>{exam.totalQuestions}</td>
                  <td>{exam.durationMinutes} min</td>
                  <td>{exam.totalMarks}</td>
                  <td>
                    <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                  </td>
                  <td>{exam.createdOn}</td>
                  <td className="pe-4">
                    <Button variant="link" size="sm" disabled className="text-muted p-0 me-3">
                      View
                    </Button>
                    <Button variant="link" size="sm" disabled className="text-muted p-0">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
