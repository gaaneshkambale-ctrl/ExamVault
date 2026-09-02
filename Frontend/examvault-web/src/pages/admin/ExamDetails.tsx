import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import SectionHeader from '../../components/SectionHeader';
import DeleteAssignmentButton from '../../components/DeleteAssignmentButton';
import { EditIcon } from '../../components/icons/ActionIcons';
import { UserCheckIcon } from '../../components/reports/ReportIcons';
import { archiveExam, publishExam, unpublishExam } from '../../api/examApi';
import { getOrCreateDefaultSection } from '../../api/sectionApi';
import { useExam } from '../../hooks/useExams';
import { useQuestions } from '../../hooks/useQuestions';
import { useAssignmentsForExam } from '../../hooks/useAssignments';
import { useGroups } from '../../hooks/useGroups';
import { useUngradedAnswers } from '../../hooks/useSubmissions';
import type { CreationMethod, ExamStatus } from '../../types/exam';
import { getAssignmentStatus, type AssignmentStatus } from '../../types/assignment';
import { extractServerError } from '../../utils/apiError';

const assignmentStatusVariant: Record<AssignmentStatus, string> = {
  Upcoming: 'info',
  Active: 'success',
  Expired: 'secondary',
};

const statusVariant: Record<ExamStatus, string> = {
  Draft: 'secondary',
  Published: 'success',
  Archived: 'dark',
};

const creationMethodLabel: Record<CreationMethod, string> = {
  Manual: 'Manual',
  AiGenerated: 'AI Generated',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: exam, isLoading, isError } = useExam(id);
  const { data: questions } = useQuestions(id);
  const { data: assignments, isLoading: isLoadingAssignments } = useAssignmentsForExam(id);
  const { data: groups } = useGroups();
  const { data: ungradedAnswers } = useUngradedAnswers(id);
  const [statusError, setStatusError] = useState('');

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups ?? []) {
      map.set(group.id, group.name);
    }
    return map;
  }, [groups]);

  const manageQuestionsMutation = useMutation({
    mutationFn: () => getOrCreateDefaultSection(id!),
    onSuccess: (section) => navigate(`/admin/exams/${id}/sections/${section.id}/edit?step=3`),
    onError: (error) => setStatusError(extractServerError(error)),
  });

  // exam.totalQuestions is a legacy field that's never kept in sync with
  // Question Service, so it's always 0 - use the real live count instead.
  const totalQuestions = questions?.length ?? exam?.totalQuestions ?? 0;

  const invalidateExam = () => {
    queryClient.invalidateQueries({ queryKey: ['exams'] });
    queryClient.invalidateQueries({ queryKey: ['exams', id] });
  };

  const publishMutation = useMutation({
    mutationFn: () => publishExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveExam(id!),
    onSuccess: () => {
      setStatusError('');
      invalidateExam();
    },
    onError: (error) => setStatusError(extractServerError(error)),
  });

  const anyStatusActionPending =
    publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending;

  return (
    <RoleAwareLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Exam Review &amp; Publish</h1>
        <div className="d-flex gap-2">
          {id && exam && (
            exam.status === 'Published' ? (
              <Link to={`/admin/assignments/new?examId=${id}`} className="btn btn-outline-primary">
                Assign Students
              </Link>
            ) : (
              <span title="Publish this exam before assigning it to students.">
                <Button variant="outline-primary" disabled>
                  Assign Students
                </Button>
              </span>
            )
          )}
          {id && exam?.containsSections && (
            <Link to={`/admin/exams/${id}/sections`} className="btn btn-outline-primary">
              Manage Sections
            </Link>
          )}
          {id && exam && !exam.containsSections && (
            <Button
              variant="outline-primary"
              disabled={manageQuestionsMutation.isPending}
              onClick={() => manageQuestionsMutation.mutate()}
            >
              {manageQuestionsMutation.isPending ? 'Loading...' : 'Manage Questions'}
            </Button>
          )}
          {id && exam?.creationMethod === 'AiGenerated' && (
            <Link to={`/admin/exams/${id}/questions/ai-generate`} className="btn btn-outline-primary">
              Generate Questions with AI
            </Link>
          )}
          {id && !!ungradedAnswers?.length && (
            <Link to={`/admin/exams/${id}/grading`} className="btn btn-outline-warning">
              Grade Code Answers <Badge bg="warning" text="dark">{ungradedAnswers.length}</Badge>
            </Link>
          )}
          {id && (
            <Link to={`/admin/exams/${id}/edit`} className="btn btn-primary">
              Edit
            </Link>
          )}
          <Link to="/admin/exams" className="btn btn-outline-secondary">
            Back to Exams
          </Link>
        </div>
      </div>

      {statusError && <Alert variant="danger">{statusError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this exam. It may not exist.
            </div>
          )}

          {exam && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h2 className="h5 fw-bold mb-1">{exam.title}</h2>
                  <p className="text-muted mb-0">{exam.description || 'No description.'}</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg={statusVariant[exam.status]} className="fs-6">
                    {exam.status}
                  </Badge>
                  {exam.status === 'Draft' && (
                    <Button
                      variant="success"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => publishMutation.mutate()}
                    >
                      {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                    </Button>
                  )}
                  {exam.status === 'Published' && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => unpublishMutation.mutate()}
                    >
                      {unpublishMutation.isPending ? 'Saving...' : 'Save as Draft'}
                    </Button>
                  )}
                  {exam.status !== 'Archived' && (
                    <Button
                      variant="outline-dark"
                      size="sm"
                      disabled={anyStatusActionPending}
                      onClick={() => archiveMutation.mutate()}
                    >
                      {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                    </Button>
                  )}
                </div>
              </div>

              <Row>
                <Field label="Category" value={exam.category || 'Uncategorized'} />
                <Field label="Exam Type" value={exam.examTypeName || 'Not set'} />
                <Field label="Creation Method" value={creationMethodLabel[exam.creationMethod]} />
                <Field label="Duration" value={`${exam.durationMinutes} minutes`} />
                <Field label="Total Marks" value={String(exam.totalMarks)} />
                <Field label="Passing Marks" value={String(exam.passingMarks)} />
                <Field label="Total Questions" value={String(totalQuestions)} />
                <Field
                  label="Created On"
                  value={new Date(exam.createdOn).toLocaleString()}
                />
              </Row>

              <div className="text-muted small mb-1">Instructions</div>
              <div>{exam.instructions || 'No instructions provided.'}</div>
            </>
          )}
        </Card.Body>
      </Card>

      {exam && (
        <Card className="border-0 shadow-sm mt-4">
          <Card.Body className="p-4">
            <SectionHeader
              icon={<span style={{ color: '#4f46e5' }}><UserCheckIcon /></span>}
              title={`Assigned Students (${assignments?.length ?? 0})`}
            />

            {isLoadingAssignments && (
              <div className="d-flex justify-content-center py-4">
                <Spinner animation="border" size="sm" />
              </div>
            )}

            {!isLoadingAssignments && assignments && assignments.length === 0 && (
              <div className="text-center text-muted py-4">
                Not assigned to any students yet. Use "Assign Students" above to get started.
              </div>
            )}

            {!isLoadingAssignments && assignments && assignments.length > 0 && (
              <Table responsive hover className="align-middle mb-0">
                <thead className="text-muted small text-uppercase table-light">
                  <tr>
                    <th>Assignment ID</th>
                    <th>Assigned To</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => {
                    const status = getAssignmentStatus(a.startAtUtc, a.endAtUtc);
                    return (
                      <tr key={a.id}>
                        <td className="fw-medium">ASG-{a.assignmentNumber}</td>
                        <td>
                          {a.targetType === 'Batch'
                            ? groupNameById.get(a.groupId ?? '') ?? 'Batch'
                            : a.targetType === 'AllStudents'
                              ? `All Students (${a.targetUserIds.length})`
                              : `Students (${a.targetUserIds.length})`}
                        </td>
                        <td>{new Date(a.startAtUtc).toLocaleString()}</td>
                        <td>{new Date(a.endAtUtc).toLocaleString()}</td>
                        <td>
                          <Badge bg={assignmentStatusVariant[status]}>{status}</Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Link
                              to={`/admin/assignments/${a.id}/edit`}
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Edit"
                              aria-label={`Edit assignment ASG-${a.assignmentNumber}`}
                            >
                              <EditIcon />
                            </Link>
                            <DeleteAssignmentButton assignmentId={a.id} />
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
      )}
    </RoleAwareLayout>
  );
}
