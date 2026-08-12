import { Badge, Button, Card, Nav, Table } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';

interface QuestionRow {
  id: string;
  questionText: string;
  type: 'Multiple Choice' | 'True/False';
  examTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
}

const mockQuestions: QuestionRow[] = [
  {
    id: '1',
    questionText: 'What is the base class for all classes in C#?',
    type: 'Multiple Choice',
    examTitle: 'C# Fundamentals',
    difficulty: 'Easy',
    marks: 1,
  },
  {
    id: '2',
    questionText: 'Which keyword is used to inherit a class in C#?',
    type: 'Multiple Choice',
    examTitle: 'C# Fundamentals',
    difficulty: 'Easy',
    marks: 1,
  },
  {
    id: '3',
    questionText: 'ASP.NET Core middleware runs in the order it is registered.',
    type: 'True/False',
    examTitle: 'ASP.NET Core',
    difficulty: 'Medium',
    marks: 1,
  },
];

const difficultyVariant: Record<QuestionRow['difficulty'], string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const tabs = ['All', 'Multiple Choice', 'True/False'] as const;

export default function QuestionBank() {
  return (
    <AdminLayout active="Questions">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Questions</h1>
        <Button variant="primary" disabled>
          + Add Question
        </Button>
      </div>

      <Nav variant="tabs" defaultActiveKey="All" className="mb-3">
        {tabs.map((tab) => (
          <Nav.Item key={tab}>
            <Nav.Link eventKey={tab} disabled={tab !== 'All'}>
              {tab} <span className="text-muted">(0)</span>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="text-muted small text-uppercase">
              <tr>
                <th className="ps-4">Question</th>
                <th>Type</th>
                <th>Exam</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th className="pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockQuestions.map((question) => (
                <tr key={question.id}>
                  <td className="ps-4 fw-medium" style={{ maxWidth: 360 }}>
                    {question.questionText}
                  </td>
                  <td>{question.type}</td>
                  <td>{question.examTitle}</td>
                  <td>
                    <Badge bg={difficultyVariant[question.difficulty]}>
                      {question.difficulty}
                    </Badge>
                  </td>
                  <td>{question.marks}</td>
                  <td className="pe-4">
                    <Button variant="link" size="sm" disabled className="text-muted p-0 me-3">
                      View
                    </Button>
                    <Button variant="link" size="sm" disabled className="text-muted p-0 me-3">
                      Edit
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
