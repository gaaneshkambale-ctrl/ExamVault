import { useMemo, useState } from 'react';
import { Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { listExams } from '../../api/examApi';

// Real, cross-tenant - ExamsController.List already accepts a SuperAdmin
// caller (widened for the Exam Usage report), same query key as that page
// so React Query dedupes the fetch instead of hitting it twice.
export default function PlatformAllExams() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();
  // exam.totalQuestions is a legacy field never kept in sync with Question
  // Service (see useQuestions.ts) - compute the real count like every other
  // exam list in the app already does.
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));

  const [searchText, setSearchText] = useState('');

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredExams = (exams ?? []).filter((exam) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(exam.tenantId) ?? '';
    return (
      exam.title.toLowerCase().includes(searchQuery) ||
      exam.category.toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  return (
    <PlatformLayout active="exams-all">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / All Exams</p>
          <h1 className="h4 fw-bold mb-1 text-primary">All Exams</h1>
          <p className="text-muted mb-0">Every exam across every organization on the platform.</p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search exams, category, organization..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredExams.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

          {!isLoading && !isError && filteredExams.length === 0 && (
            <div className="text-center text-muted py-5">No exams match your search.</div>
          )}

          {!isLoading && !isError && filteredExams.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Exam</th>
                  <th>Organization</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th className="pe-4">Created On</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="ps-4">
                      <div className="fw-medium">{exam.title}</div>
                      {exam.examCode && (
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {exam.examCode}
                        </div>
                      )}
                    </td>
                    <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                    <td className="text-muted">{exam.category || '—'}</td>
                    <td>
                      <Badge
                        bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}
                      >
                        {exam.status}
                      </Badge>
                    </td>
                    <td className="text-muted">{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                    <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
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
