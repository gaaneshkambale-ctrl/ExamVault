import { Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import ExamWizardStepper from '../../components/ExamWizardStepper';
import DeleteSectionButton from '../../components/DeleteSectionButton';
import { EditIcon } from '../../components/icons/ActionIcons';
import { useExam } from '../../hooks/useExams';
import { useSections } from '../../hooks/useSections';

function SectionsIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v-.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 2.5V3" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
      <circle cx="7.5" cy="9" r="0.6" fill="#a5b4fc" />
      <circle cx="7.5" cy="13" r="0.6" fill="#a5b4fc" />
      <circle cx="7.5" cy="17" r="0.6" fill="#a5b4fc" />
    </svg>
  );
}

function GuidelineIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
      style={{ width: 32, height: 32, background: '#eef2ff', color: '#4f46e5' }}
    >
      {children}
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ReorderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 7 4 11 8" /><line x1="7" y1="4" x2="7" y2="20" />
      <polyline points="21 16 17 20 13 16" /><line x1="17" y1="4" x2="17" y2="20" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const GUIDELINES = [
  { icon: <ListIcon />, text: <>Add sections to organize your exam questions effectively.</> },
  { icon: <ReorderIcon />, text: <>You can reorder sections using drag &amp; drop or the reorder button.</> },
  { icon: <ClockIcon />, text: <>Each section can have its own duration, marks and negative marking.</> },
  { icon: <OrderIcon />, text: <>Students must attempt sections in the configured order.</> },
];

const WHY_SECTIONS = [
  { icon: <ListIcon />, title: 'Organize Questions', text: 'Group similar questions into sections for better structure' },
  { icon: <ClockIcon />, title: 'Different Rules', text: 'Set different duration, marks and negative marking for each section' },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    ),
    title: 'Better Experience',
    text: 'Students can navigate sections clearly during the exam',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Detailed Analysis',
    text: 'Get section-wise performance reports and analytics',
  },
];

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function SummaryRow({ icon, label, value }: SummaryRowProps) {
  return (
    <div className="d-flex justify-content-between align-items-center py-1">
      <div className="d-flex align-items-center gap-2 text-muted small">
        {icon}
        {label}
      </div>
      <span className="small fw-bold">{value}</span>
    </div>
  );
}

export default function ExamWizardSections() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: exam } = useExam(examId);
  const { data: sections, isLoading, isError } = useSections(examId);

  const totals = (sections ?? []).reduce(
    (acc, s) => ({
      questions: acc.questions + s.questionCount,
      marks: acc.marks + s.marks,
      duration: acc.duration + s.durationMinutes,
    }),
    { questions: 0, marks: 0, duration: 0 },
  );

  return (
    <RoleAwareLayout active="Exams">
      <div className="mb-1">
        <p className="text-muted small mb-1">Create Exam / {exam?.title ?? '...'}</p>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h1 className="h4 fw-bold mb-0 text-primary">Manage Sections</h1>
            <p className="text-muted mb-0">Organize your exam into sections and set section-wise rules</p>
          </div>
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

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className={isLoading || isError || (sections?.length ?? 0) === 0 ? 'p-4' : 'p-0'}>
              {isLoading && (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              )}

              {isError && (
                <div className="text-center text-danger py-5">Couldn't load sections. Please try again.</div>
              )}

              {!isLoading && !isError && sections?.length === 0 && (
                <div className="text-center py-4">
                  <div className="d-flex justify-content-center mb-3">
                    <SectionsIllustration />
                  </div>
                  <h2 className="h5 fw-bold mb-2">No Sections Added Yet</h2>
                  <p className="text-muted mb-4">
                    Sections help you organize questions and set different rules for each part of your exam.
                  </p>
                  <Link
                    to={`/admin/exams/${examId}/sections/create?wizard=true`}
                    className="btn btn-primary d-inline-flex align-items-center gap-2 mb-3"
                  >
                    + Add Your First Section
                  </Link>
                  <p className="text-muted small mb-0">You can add multiple sections and reorder them as needed.</p>
                </div>
              )}

              {!isLoading && !isError && sections && sections.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
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

          {!isLoading && !isError && (
            <>
              <h2 className="h6 fw-bold mt-4 mb-3">Why use sections?</h2>
              <Row className="g-3">
                {WHY_SECTIONS.map((item) => (
                  <Col key={item.title} sm={6} lg={3}>
                    <Card className="border-0 shadow-sm h-100 text-center">
                      <Card.Body>
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-2"
                          style={{ width: 44, height: 44, background: '#eef2ff', color: '#4f46e5' }}
                        >
                          {item.icon}
                        </div>
                        <div className="fw-bold small mb-1">{item.title}</div>
                        <div className="text-muted small">{item.text}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Section Guidelines</Card.Title>
              {GUIDELINES.map((g, i) => (
                <div key={i} className="d-flex gap-2 mb-3">
                  <GuidelineIcon>{g.icon}</GuidelineIcon>
                  <div className="small text-muted">{g.text}</div>
                </div>
              ))}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title className="h6 fw-bold mb-3">Section Summary</Card.Title>
              <SummaryRow icon={<ListIcon />} label="Total Sections" value={String(sections?.length ?? 0)} />
              <SummaryRow icon={<OrderIcon />} label="Total Questions" value={String(totals.questions)} />
              <SummaryRow icon={<OrderIcon />} label="Total Marks" value={String(totals.marks)} />
              <SummaryRow icon={<ClockIcon />} label="Total Duration" value={`${totals.duration} min`} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex justify-content-between mt-4">
        <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate(`/admin/exams/${examId}/wizard/configuration`)}
        >
          Next: Exam Configuration &rarr;
        </Button>
      </div>
    </RoleAwareLayout>
  );
}
