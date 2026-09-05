import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import { useExams } from '../../hooks/useExams';
import { useAuth } from '../../hooks/useAuth';
import { getMyResult } from '../../api/resultApi';
import { getGrade } from '../../types/result';
import type { ResultSummaryResponse } from '../../types/result';
import type { CreationMethod } from '../../types/exam';
import { generateCertificatePdf } from '../../utils/generateCertificatePdf';
import { CERTIFICATE_MIN_PERCENTAGE, isCertificateEligible } from '../../utils/certificateId';

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

const gradeVariant: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  B: 'info',
  C: 'warning',
  F: 'danger',
};

export default function MyCertificates() {
  const { user } = useAuth();
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const [searchText, setSearchText] = useState('');

  const publishedExams = useMemo(() => (exams ?? []).filter((exam) => exam.status === 'Published'), [exams]);

  const creationMethodById = useMemo(() => {
    const map = new Map<string, CreationMethod>();
    for (const exam of exams ?? []) {
      map.set(exam.id, exam.creationMethod);
    }
    return map;
  }, [exams]);

  const resultQueries = useQueries({
    queries: publishedExams.map((exam) => ({
      queryKey: ['results', 'mine', exam.id],
      queryFn: () => getMyResult(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingResults = publishedExams.length > 0 && resultQueries.some((q) => q.isLoading);
  const loading = isLoadingExams || isLoadingResults;

  // A certificate is earned for every exam the student scored 80%+ on - no
  // separate issuance step, no persisted certificate record. Generated fresh
  // client-side from the same result data "My Results" already shows.
  const rows: ResultSummaryResponse[] = resultQueries
    .map((q) => q.data)
    .filter((result): result is ResultSummaryResponse => !!result && isCertificateEligible(result))
    .sort((a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime());

  const filteredRows = rows.filter((result) =>
    result.examTitle.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  return (
    <StudentLayout active="My Certificates">
      <h1 className="h4 fw-bold mb-1 text-primary">My Certificates</h1>
      <p className="text-muted mb-4">A certificate for every exam you've scored {CERTIFICATE_MIN_PERCENTAGE}% or above on.</p>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search by exam..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={loading || filteredRows.length === 0 ? '' : 'p-0'}>
          {loading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              No certificates yet. Score {CERTIFICATE_MIN_PERCENTAGE}% or above on an exam to earn one here.
            </div>
          )}

          {!loading && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No certificates match your search.</div>
          )}

          {!loading && filteredRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Exam Title</th>
                  <th>Creation Method</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Completed On</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((result) => {
                  const percentage =
                    result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
                  const creationMethod = creationMethodById.get(result.examId);
                  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);
                  return (
                    <tr key={result.attemptId}>
                      <td className="ps-4 fw-medium">{result.examTitle}</td>
                      <td>{creationMethod ? creationMethodLabel[creationMethod] : '—'}</td>
                      <td>
                        {result.totalScore} / {result.totalMarks} ({percentage}%)
                      </td>
                      <td>
                        <Badge bg={gradeVariant[grade]}>{grade}</Badge>
                      </td>
                      <td>{new Date(result.submittedAtUtc).toLocaleDateString()}</td>
                      <td className="pe-4">
                        <div className="d-flex gap-2">
                          <Link to={`/certificates/${result.examId}`} className="btn btn-primary btn-sm">
                            View Certificate
                          </Link>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            disabled={!user}
                            onClick={() => user && generateCertificatePdf(result, user.fullName)}
                          >
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </StudentLayout>
  );
}
