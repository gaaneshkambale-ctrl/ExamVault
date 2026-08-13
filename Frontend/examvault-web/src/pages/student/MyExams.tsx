import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import { useExams } from '../../hooks/useExams';
import { getMyAttempt } from '../../api/submissionApi';
import type { ExamResponse, ExamType } from '../../types/exam';

const examTypeLabel: Record<ExamType, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

type Tab = 'All' | 'Upcoming' | 'Completed' | 'In Progress';
const TABS: Tab[] = ['All', 'Upcoming', 'Completed', 'In Progress'];

type RowStatus = 'Upcoming' | 'In Progress' | 'Completed';

const statusVariant: Record<RowStatus, string> = {
  Upcoming: 'primary',
  'In Progress': 'warning',
  Completed: 'success',
};

interface ExamRow extends ExamResponse {
  rowStatus: RowStatus;
}

export default function MyExams() {
  const { data: exams, isLoading, isError } = useExams();
  const [tab, setTab] = useState<Tab>('All');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | ExamType>('All');

  // Only Published exams are relevant to a student.
  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const attemptQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['submissions', 'mine', exam.id],
      queryFn: () => getMyAttempt(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingAttempts = publishedExams.length > 0 && attemptQueries.some((q) => q.isLoading);

  const rows: ExamRow[] = publishedExams.map((exam, index) => {
    const attempt = attemptQueries[index]?.data;
    const rowStatus: RowStatus = !attempt
      ? 'Upcoming'
      : attempt.attempt.status === 'InProgress'
        ? 'In Progress'
        : 'Completed';
    return { ...exam, rowStatus };
  });

  const tabRows = tab === 'All' ? rows : rows.filter((row) => row.rowStatus === tab);

  const filteredExams = tabRows.filter((exam) => {
    if (typeFilter !== 'All' && exam.examType !== typeFilter) {
      return false;
    }
    if (searchText.trim() && !exam.title.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const loading = isLoading || isLoadingAttempts;

  return (
    <StudentLayout active="My Exams">
      <h1 className="h4 fw-bold mb-4">My Exams</h1>

      <Card className="border-0 shadow-sm">
        <Card.Body className="pb-0">
          <div className="d-flex gap-4 border-bottom mb-3">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn-link text-decoration-none px-0 pb-2"
                style={{
                  borderBottom: t === tab ? '2px solid #4f46e5' : '2px solid transparent',
                  color: t === tab ? '#4f46e5' : '#6c757d',
                  fontWeight: t === tab ? 600 : 400,
                }}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <Row className="g-2 mb-3">
            <Col md={8}>
              <Form.Control
                type="search"
                placeholder="Search exams..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'All' | ExamType)}
              >
                <option value="All">All Types</option>
                <option value="Manual">Manual</option>
                <option value="AiGenerated">AI Generated</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>

        <Card.Body className={loading || isError || filteredExams.length === 0 ? 'pt-0' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && isError && (
            <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
          )}

          {!loading && !isError && filteredExams.length === 0 && (
            <div className="text-center text-muted py-5">
              {tab === 'Completed' || tab === 'In Progress'
                ? 'Nothing here yet.'
                : 'No exams match your search/filter.'}
            </div>
          )}

          {!loading && !isError && filteredExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam Title</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="ps-4 fw-medium">{exam.title}</td>
                    <td>{examTypeLabel[exam.examType]}</td>
                    <td>{exam.totalQuestions}</td>
                    <td>{exam.durationMinutes} min</td>
                    <td>
                      <Badge bg={statusVariant[exam.rowStatus]}>{exam.rowStatus}</Badge>
                    </td>
                    <td className="pe-4">
                      {exam.rowStatus === 'Upcoming' && (
                        <Link to={`/exams/${exam.id}`} className="btn btn-primary btn-sm">
                          Start Exam
                        </Link>
                      )}
                      {exam.rowStatus === 'In Progress' && (
                        <Link to={`/exams/${exam.id}/take`} className="btn btn-warning btn-sm">
                          Resume Exam
                        </Link>
                      )}
                      {exam.rowStatus === 'Completed' && (
                        <Button variant="outline-secondary" size="sm" disabled>
                          View Result
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </StudentLayout>
  );
}
