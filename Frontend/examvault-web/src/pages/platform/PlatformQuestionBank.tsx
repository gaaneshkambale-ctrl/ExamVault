import { useMemo, useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import { listAllQuestions } from '../../api/questionApi';

// Real, cross-tenant - new GET /api/questions/all (SuperAdmin only),
// relying on QuestionDbContext's existing IsSuperAdmin query-filter bypass.
// QuestionService has no Exams table of its own (different database), so
// exam titles are joined here against the platform's own already-fetched
// cross-tenant exam list (same query key as All Exams - no extra fetch).
export default function PlatformQuestionBank() {
  const { data: questions, isLoading, isError } = useQuery({ queryKey: ['platform-questions'], queryFn: listAllQuestions });
  const { data: exams } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const [searchText, setSearchText] = useState('');

  const examTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (exams ?? []).forEach((e) => map.set(e.id, e.title));
    return map;
  }, [exams]);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredQuestions = (questions ?? []).filter((question) => {
    if (!searchQuery) return true;
    const examTitle = examTitleById.get(question.examId) ?? '';
    const orgName = tenantNameById.get(question.tenantId) ?? '';
    return (
      question.questionText.toLowerCase().includes(searchQuery) ||
      examTitle.toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  return (
    <PlatformLayout active="exams-question-bank">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / Question Bank</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Question Bank</h1>
          <p className="text-muted mb-0">Every question across every organization on the platform.</p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search question text, exam, organization..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredQuestions.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load questions. Please try again.</div>}

          {!isLoading && !isError && filteredQuestions.length === 0 && (
            <div className="text-center text-muted py-5">No questions match your search.</div>
          )}

          {!isLoading && !isError && filteredQuestions.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Question</th>
                  <th>Exam</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th className="pe-4">Marks</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((question) => (
                  <tr key={question.id}>
                    <td className="ps-4" style={{ maxWidth: 320 }}>
                      <div className="text-truncate">{question.questionText}</div>
                    </td>
                    <td className="text-muted">{examTitleById.get(question.examId) ?? '—'}</td>
                    <td className="text-muted">{tenantNameById.get(question.tenantId) ?? '—'}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        {question.questionType}
                      </Badge>
                    </td>
                    <td className="text-muted">{question.difficulty}</td>
                    <td className="pe-4 text-muted">{question.marks}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
