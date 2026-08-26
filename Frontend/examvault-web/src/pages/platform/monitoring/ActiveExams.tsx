import { useMemo } from 'react';
import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../../layouts/PlatformLayout';
import { useTenants } from '../../../hooks/useTenants';
import { listExams } from '../../../api/examApi';
import type { ExamResponse } from '../../../types/exam';

type ExamWindowStatus = 'Live' | 'Upcoming';

interface ActiveExamEntry {
  exam: ExamResponse;
  windowStatus: ExamWindowStatus;
  startsAt: number;
}

function toWindowStatus(exam: ExamResponse, now: number): ExamWindowStatus | null {
  const startsAt = new Date(exam.startAtUtc!).getTime();
  if (startsAt > now) return 'Upcoming';
  const endsAt = exam.endAtUtc ? new Date(exam.endAtUtc).getTime() : null;
  return endsAt === null || endsAt >= now ? 'Live' : null;
}

export default function ActiveExams() {
  const { data: exams, isLoading: examsLoading, isError: examsError } = useQuery({
    queryKey: ['platform-exams'],
    queryFn: listExams,
  });
  const { data: tenants, isLoading: tenantsLoading, isError: tenantsError } = useTenants();

  const isLoading = examsLoading || tenantsLoading;
  const isError = examsError || tenantsError;

  const activeExams = useMemo<ActiveExamEntry[]>(() => {
    const now = Date.now();
    return (exams ?? [])
      .filter((exam) => exam.status === 'Published' && exam.startAtUtc)
      .map((exam) => ({ exam, windowStatus: toWindowStatus(exam, now), startsAt: new Date(exam.startAtUtc!).getTime() }))
      .filter((entry): entry is ActiveExamEntry => entry.windowStatus !== null)
      .sort((a, b) => a.startsAt - b.startsAt);
  }, [exams]);

  return (
    <PlatformLayout active="mon-active-exams">
      <p className="text-muted small mb-1">Platform Admin / System Monitoring / Active Exams</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Active Exams</h1>
      <p className="text-muted mb-3">Published exams that are live now or scheduled to start.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>}

      {!isLoading && !isError && (
        <Card className="border-0 shadow-sm">
          <Card.Body className={activeExams.length === 0 ? '' : 'p-0'}>
            {activeExams.length === 0 ? (
              <div className="text-center text-muted py-5">No live or upcoming exams.</div>
            ) : (
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">Exam Name</th>
                    <th>Organization</th>
                    <th>Starts At</th>
                    <th className="pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeExams.map(({ exam, windowStatus }) => (
                    <tr key={exam.id}>
                      <td className="ps-4 fw-medium">{exam.title}</td>
                      <td className="text-muted">
                        {tenants?.find((t) => t.id === exam.tenantId)?.name ?? 'Unknown organization'}
                      </td>
                      <td className="text-muted">{new Date(exam.startAtUtc!).toLocaleString()}</td>
                      <td className="pe-4">
                        <Badge bg={windowStatus === 'Live' ? 'success' : 'warning'}>{windowStatus}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </PlatformLayout>
  );
}
