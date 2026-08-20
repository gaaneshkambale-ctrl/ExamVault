import { useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { ViewIcon } from '../../components/icons/ActionIcons';
import { useExams } from '../../hooks/useExams';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
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

export default function AdminReports() {
  const { data: exams, isLoading, isError } = useExams();
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));
  const [searchText, setSearchText] = useState('');

  const filteredExams = (exams ?? []).filter((exam) =>
    exam.title.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  return (
    <AdminLayout active="Reports">
      <h1 className="h4 fw-bold mb-1 text-primary">Reports</h1>
      <p className="text-muted mb-4">Pick an exam to see its performance report.</p>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search exams..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredExams.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
          )}

          {!isLoading && !isError && (exams ?? []).length === 0 && (
            <div className="text-center text-muted py-5">No exams yet.</div>
          )}

          {!isLoading && !isError && (exams ?? []).length > 0 && filteredExams.length === 0 && (
            <div className="text-center text-muted py-5">No exams match your search.</div>
          )}

          {!isLoading && !isError && filteredExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Title</th>
                  <th>Type</th>
                  <th>Total Questions</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="ps-4 fw-medium">{exam.title}</td>
                    <td>{examTypeLabel[exam.examType]}</td>
                    <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                    <td>
                      <Badge bg={statusVariant[exam.status]}>{exam.status}</Badge>
                    </td>
                    <td className="pe-4">
                      <Link
                        to={`/admin/reports/${exam.id}`}
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                        style={{ width: 32, height: 32 }}
                        title="View Report"
                        aria-label="View report"
                      >
                        <ViewIcon />
                      </Link>
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
