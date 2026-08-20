import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteSectionButton from '../../components/DeleteSectionButton';
import { useExam } from '../../hooks/useExams';
import { useSections } from '../../hooks/useSections';

export default function ManageSections() {
  const { examId } = useParams<{ examId: string }>();
  const { data: exam } = useExam(examId);
  const { data: sections, isLoading, isError } = useSections(examId);

  const totals = (sections ?? []).reduce(
    (acc, s) => ({
      questionCount: acc.questionCount + s.questionCount,
      marks: acc.marks + s.marks,
      durationMinutes: acc.durationMinutes + s.durationMinutes,
    }),
    { questionCount: 0, marks: 0, durationMinutes: 0 },
  );

  return (
    <AdminLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">
          Exams / {exam?.title ?? '...'} / Sections
        </p>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h4 fw-bold mb-0 text-primary">Manage Sections</h1>
          <div className="d-flex gap-2">
            <Link
              to={`/admin/exams/${examId}/sections/reorder`}
              className="btn btn-outline-secondary"
            >
              Reorder Sections
            </Link>
            <Link to={`/admin/exams/${examId}/sections/create`} className="btn btn-primary">
              + Add Section
            </Link>
          </div>
        </div>
      </div>

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
              No sections yet. Click "+ Add Section" to create one.
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
                    <td className="fw-medium">
                      <Link to={`/admin/exams/${examId}/sections/${section.id}`}>{section.name}</Link>
                    </td>
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
                          to={`/admin/exams/${examId}/sections/${section.id}/edit`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          Edit
                        </Link>
                        <DeleteSectionButton examId={examId!} sectionId={section.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold">
                  <td className="ps-4" colSpan={2}>
                    Total
                  </td>
                  <td>{totals.questionCount}</td>
                  <td>{totals.marks}</td>
                  <td>{totals.durationMinutes} mins</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="mt-3">
        <Link to={`/admin/exams/${examId}`} className="btn btn-outline-secondary">
          Back to Exam
        </Link>
      </div>
    </AdminLayout>
  );
}
