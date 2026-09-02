import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import DeleteQuestionButton from '../../components/DeleteQuestionButton';
import { EditIcon, ViewIcon } from '../../components/icons/ActionIcons';
import { useSection } from '../../hooks/useSections';
import { useQuestionsBySection } from '../../hooks/useQuestions';
import type { QuestionType } from '../../types/question';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MultipleChoice: 'Single Choice',
  MultiSelect: 'Multiple Choice',
  TrueFalse: 'True/False',
  CodeProgram: 'Code / Programming',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function SectionDetails() {
  const { examId, sectionId } = useParams<{ examId: string; sectionId: string }>();
  const { data: section, isLoading, isError } = useSection(examId, sectionId);
  const { data: questions } = useQuestionsBySection(examId, sectionId);

  return (
    <RoleAwareLayout active="Exams">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Section Details</h1>
        <div className="d-flex gap-2">
          <Link to={`/admin/exams/${examId}/sections/${sectionId}/edit`} className="btn btn-primary">
            Edit Section
          </Link>
          <Link to={`/admin/exams/${examId}/sections`} className="btn btn-outline-secondary">
            Back to Sections
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <div className="text-center text-danger py-5">Couldn't load this section. It may not exist.</div>
      )}

      {section && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h5 fw-bold mb-1">{section.name}</h2>
              <p className="text-muted mb-3">{section.description || 'No description.'}</p>

              <Row>
                <Field label="Questions" value={String(section.questionCount)} />
                <Field label="Marks" value={String(section.marks)} />
                <Field label="Duration" value={`${section.durationMinutes} minutes`} />
                <Field label="Navigation" value={section.navigationType} />
                <Field
                  label="Negative Marking"
                  value={section.negativeMarkingEnabled ? `Yes (${section.negativeMarks})` : 'No'}
                />
                <Field label="Allow Review" value={section.allowReview ? 'Yes' : 'No'} />
              </Row>

              <div className="text-muted small mb-1">Instructions</div>
              <div>{section.instructions || 'No instructions provided.'}</div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h3 className="h6 fw-bold mb-3">Assigned Questions ({questions?.length ?? 0})</h3>

              {questions && questions.length === 0 && (
                <div className="text-center text-muted py-4">
                  No questions assigned yet. Use Edit Section to add some.
                </div>
              )}

              {questions && questions.length > 0 && (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="text-muted small text-uppercase table-light">
                    <tr>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Marks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.id}>
                        <td>{q.questionText}</td>
                        <td>{QUESTION_TYPE_LABELS[q.questionType]}</td>
                        <td>
                          <Badge bg="secondary">{q.difficulty}</Badge>
                        </td>
                        <td>{q.marks}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Link
                              to={`/admin/questions/${q.id}`}
                              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="View"
                              aria-label="View question"
                            >
                              <ViewIcon />
                            </Link>
                            <Link
                              to={`/admin/questions/${q.id}/edit`}
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                              style={{ width: 32, height: 32 }}
                              title="Edit"
                              aria-label="Edit question"
                            >
                              <EditIcon />
                            </Link>
                            <DeleteQuestionButton questionId={q.id} examId={q.examId} iconOnly />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </RoleAwareLayout>
  );
}
