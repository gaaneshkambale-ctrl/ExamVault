import { useMemo } from 'react';
import { Accordion, Badge, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { listExams } from '../../api/examApi';
import type { ExamResponse } from '../../types/exam';

// Same cross-tenant exam list as All Exams (same query key, dedupes the
// fetch), grouped client-side by each comma-separated Tags token - an exam
// with multiple tags appears under each one. Real data: Tags is a genuine
// free-text field on every exam (Backend/.../ExamPaper.cs), not faked.
export default function PlatformExamTags() {
  const { data: exams, isLoading, isError } = useQuery({ queryKey: ['platform-exams'], queryFn: listExams });
  const { data: tenants } = useTenants();

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const byTag = useMemo(() => {
    const map = new Map<string, ExamResponse[]>();
    (exams ?? []).forEach((exam) => {
      const tags = (exam.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      tags.forEach((tag) => {
        const existing = map.get(tag) ?? [];
        existing.push(exam);
        map.set(tag, existing);
      });
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [exams]);

  const untaggedCount = (exams ?? []).filter((e) => !(e.tags ?? '').trim()).length;

  return (
    <PlatformLayout active="exams-tags">
      <p className="text-muted small mb-1">Platform Admin / Exams / Tags</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Tags</h1>
      <p className="text-muted mb-3">Exams across every organization, grouped by tag.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

      {!isLoading && !isError && byTag.length === 0 && (
        <div className="text-center text-muted py-5">No exam has been tagged yet.</div>
      )}

      {!isLoading && !isError && byTag.length > 0 && (
        <>
          <Accordion alwaysOpen>
            {byTag.map(([tag, tagExams], index) => (
              <Accordion.Item eventKey={String(index)} key={tag} className="border-0 shadow-sm mb-2">
                <Accordion.Header>
                  <span className="fw-medium">{tag}</span>
                  <Badge bg="light" text="dark" className="border ms-2">
                    {tagExams.length}
                  </Badge>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase bg-body-tertiary">
                      <tr>
                        <th className="ps-4">Exam</th>
                        <th>Organization</th>
                        <th>Status</th>
                        <th className="pe-4">Created On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tagExams.map((exam) => (
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
          {untaggedCount > 0 && (
            <div className="text-muted small mt-2">{untaggedCount} exam(s) have no tags yet.</div>
          )}
        </>
      )}
    </PlatformLayout>
  );
}
