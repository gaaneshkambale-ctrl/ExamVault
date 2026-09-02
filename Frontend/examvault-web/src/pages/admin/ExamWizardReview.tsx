import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import ExamWizardStepper from '../../components/ExamWizardStepper';
import { publishExam } from '../../api/examApi';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useSections } from '../../hooks/useSections';
import { extractServerError } from '../../utils/apiError';

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function Field({ icon, label, value }: FieldProps) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="d-flex align-items-start gap-2">
        <div className="mt-1">{icon}</div>
        <div>
          <div className="text-muted small mb-1">{label}</div>
          <div className="fw-bold">{value}</div>
        </div>
      </div>
    </Col>
  );
}

export default function ExamWizardReview() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exam, isLoading } = useExam(examId);
  const { data: questions } = useQuestions(examId);
  const { data: sections } = useSections(examId, Boolean(exam?.containsSections));
  const [error, setError] = useState('');

  const totalQuestions = questions?.length ?? 0;

  const sectionTotals = (sections ?? []).reduce(
    (acc, s) => ({ marks: acc.marks + s.marks, durationMinutes: acc.durationMinutes + s.durationMinutes }),
    { marks: 0, durationMinutes: 0 },
  );
  const hasSections = Boolean(exam?.containsSections) && (sections?.length ?? 0) > 0;
  const marksMismatch = hasSections && exam && sectionTotals.marks !== exam.totalMarks;
  const durationMismatch = hasSections && exam && sectionTotals.durationMinutes !== exam.durationMinutes;
  const passingMarksUnreachable = hasSections && exam && exam.passingMarks > sectionTotals.marks;
  const showMismatchWarning = marksMismatch || durationMismatch || passingMarksUnreachable;

  const publishMutation = useMutation({
    mutationFn: () => publishExam(examId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      navigate(`/admin/exams/${examId}`);
    },
    onError: (err) => setError(extractServerError(err)),
  });

  return (
    <RoleAwareLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">Create Exam / {exam?.title ?? '...'}</p>
        <h1 className="h4 fw-bold mb-0 text-primary">Review &amp; Publish</h1>
        <p className="text-muted mb-2">Review your exam details before publishing</p>
      </div>

      <ExamWizardStepper currentStep={4} containsSections={Boolean(exam?.containsSections)} />

      {error && <Alert variant="danger">{error}</Alert>}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {exam && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                  style={{ width: 36, height: 36, background: '#eef2ff' }}
                >
                  <DocumentIcon />
                </div>
                <div>
                  <div className="fw-bold">Exam Summary</div>
                  <div className="text-muted small">Review the key details of your exam.</div>
                </div>
              </div>
              <Row>
                <Field icon={<DocumentIcon />} label="Exam Name" value={exam.title} />
                <Field icon={<TagIcon />} label="Category" value={exam.category || 'Uncategorized'} />
                <Field icon={<CheckSquareIcon />} label="Exam Type" value={exam.examTypeName || 'Not set'} />
                <Field icon={<ListIcon />} label="Creation Method" value={exam.creationMethod} />
                <Field icon={<ListIcon />} label="Total Questions" value={String(totalQuestions)} />
                <Field icon={<StarIcon />} label="Total Marks" value={String(exam.totalMarks)} />
                <Field icon={<AwardIcon />} label="Passing Marks" value={String(exam.passingMarks)} />
                <Field icon={<ClockIcon />} label="Duration" value={`${exam.durationMinutes} minutes`} />
                <Field icon={<PersonIcon />} label="Max Attempts" value={String(exam.maxAttempts)} />
              </Row>
            </Card.Body>
          </Card>

          {showMismatchWarning && (
            <Card className="border-0 shadow-sm mb-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <Card.Body className="p-4">
                <div className="d-flex gap-2 mb-2">
                  <AlertTriangleIcon />
                  <div className="fw-bold" style={{ color: '#92400e' }}>Important Notice</div>
                </div>
                <ul className="mb-2 small" style={{ color: '#92400e' }}>
                  {marksMismatch && (
                    <li>
                      Sections add up to {sectionTotals.marks} mark(s), but Total Marks above is {exam.totalMarks}.
                    </li>
                  )}
                  {durationMismatch && (
                    <li>
                      Sections add up to {sectionTotals.durationMinutes} minute(s), but Duration above is{' '}
                      {exam.durationMinutes} minute(s).
                    </li>
                  )}
                  {passingMarksUnreachable && (
                    <li>
                      Passing Marks is {exam.passingMarks}, but sections only add up to {sectionTotals.marks}{' '}
                      marks - this exam can never be passed.
                    </li>
                  )}
                </ul>
                <div className="small fw-medium mb-0" style={{ color: '#92400e' }}>
                  Publishing will be blocked until these match.
                </div>
              </Card.Body>
            </Card>
          )}

          {exam.containsSections && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{ width: 36, height: 36, background: '#eef2ff' }}
                  >
                    <LayersIcon />
                  </div>
                  <div>
                    <div className="fw-bold">Sections Summary</div>
                    <div className="text-muted small">Review all sections and their details.</div>
                  </div>
                </div>
                {(sections?.length ?? 0) === 0 ? (
                  <div className="text-muted small">No sections added yet.</div>
                ) : (
                  <Table responsive className="mb-0 align-middle">
                    <thead className="text-muted small text-uppercase table-light">
                      <tr>
                        <th>Section Name</th>
                        <th>Questions</th>
                        <th>Marks</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections!.map((section) => (
                        <tr key={section.id}>
                          <td>{section.name}</td>
                          <td>{section.questionCount}</td>
                          <td>{section.marks}</td>
                          <td>{section.durationMinutes} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-between">
            <Button
              variant="outline-secondary"
              onClick={() => navigate(`/admin/exams/${examId}/wizard/configuration`)}
            >
              Back
            </Button>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')}>
                Save as Draft
              </Button>
              <Button
                variant="success"
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish Exam'}
              </Button>
            </div>
          </div>
        </>
      )}
    </RoleAwareLayout>
  );
}
