import { useMemo } from 'react';
import { Accordion, Badge, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';

// Same cross-tenant exam list as All Exams (same query key, dedupes the
// fetch), grouped client-side by Category - no new backend needed, this
// is real data, not a placeholder.
export default function PlatformExamCategories() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof exams>();
    (exams ?? []).forEach((exam) => {
      const key = exam.category || 'Uncategorized';
      const existing = map.get(key) ?? [];
      existing.push(exam);
      map.set(key, existing);
    });
    return [...map.entries()].sort((a, b) => b[1]!.length - a[1]!.length);
  }, [exams]);

  return (
    <PlatformLayout active="exams-categories">
      <p className="text-muted small mb-1">Platform Admin / Exams / Exam Categories</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Exam Categories</h1>
      <p className="text-muted mb-3">Exams across every organization, grouped by category.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

      {!isLoading && !isError && byCategory.length === 0 && (
        <div className="text-center text-muted py-5">No exams yet.</div>
      )}

      {!isLoading && !isError && byCategory.length > 0 && (
        <Accordion defaultActiveKey="0" alwaysOpen>
          {byCategory.map(([category, categoryExams], index) => (
            <Accordion.Item eventKey={String(index)} key={category} className="border-0 shadow-sm mb-2">
              <Accordion.Header>
                <span className="fw-medium">{category}</span>
                <Badge bg="light" text="dark" className="border ms-2">
                  {categoryExams!.length}
                </Badge>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th className="ps-4">Exam</th>
                      <th>Organization</th>
                      <th>Status</th>
                      <th className="pe-4">Created On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryExams!.map((exam) => (
                      <tr key={exam.id}>
                        <td className="ps-4">{exam.title}</td>
                        <td className="text-muted">{tenantNameById.get(exam.tenantId) ?? '—'}</td>
                        <td>
                          <Badge
                            bg={exam.status === 'Published' ? 'success' : exam.status === 'Archived' ? 'secondary' : 'warning'}
                          >
                            {exam.status}
                          </Badge>
                        </td>
                        <td className="pe-4">{new Date(exam.createdOn).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </PlatformLayout>
  );
}
