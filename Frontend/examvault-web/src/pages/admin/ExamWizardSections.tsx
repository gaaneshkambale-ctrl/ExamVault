import { Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import ExamWizardStepper from '../../components/ExamWizardStepper';
import DeleteSectionButton from '../../components/DeleteSectionButton';
import { EditIcon } from '../../components/icons/ActionIcons';
import { useExam } from '../../hooks/useExams';
import { useSections } from '../../hooks/useSections';

export default function ExamWizardSections() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: exam } = useExam(examId);
  const { data: sections, isLoading, isError } = useSections(examId);

  return (
    <AdminLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">Create Exam / {exam?.title ?? '...'}</p>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h1 className="h4 fw-bold mb-0 text-primary">Manage Sections</h1>
          <div className="d-flex gap-2">
            <Link
              to={`/admin/exams/${examId}/sections/reorder?wizard=true`}
              className="btn btn-outline-secondary"
            >
              Reorder Sections
            </Link>
            <Link to={`/admin/exams/${examId}/sections/create?wizard=true`} className="btn btn-primary">
              + Add Section
            </Link>
          </div>
        </div>
      </div>

      <ExamWizardStepper currentStep={2} containsSections={true} />

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || (sections?.length ?? 0) === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load sections. Please try again.</div>
          )}

          {!isLoading && !isError && sections?.length === 0 && (
            <div className="text-center text-muted py-5">
              No sections yet. Click "+ Add Section" to create one, or continue and add sections later.
            </div>
          )}

          {!isLoading && !isError && sections && sections.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase table-light">
                <tr>
                  <th className="ps-4">#</th>
                  <th>Section Name</th>
                  <th>Questions</th>
                  <th>Marks</th>
                  <th>Duration</th>
                  <th>Navigation</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, index) => (
                  <tr key={section.id}>
                    <td className="ps-4">{index + 1}</td>
                    <td className="fw-medium">{section.name}</td>
                    <td>{section.questionCount}</td>
                    <td>{section.marks}</td>
                    <td>{section.durationMinutes} mins</td>
                    <td>{section.navigationType}</td>
                    <td>
                      <Badge bg="success">Active</Badge>
                    </td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/exams/${examId}/sections/${section.id}/edit?wizard=true`}
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Edit"
                          aria-label={`Edit ${section.name}`}
                        >
                          <EditIcon />
                        </Link>
                        <DeleteSectionButton examId={examId!} sectionId={section.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end mt-3">
        <Button
          variant="primary"
          onClick={() => navigate(`/admin/exams/${examId}/wizard/configuration`)}
        >
          Next: Exam Configuration
        </Button>
      </div>
    </AdminLayout>
  );
}
