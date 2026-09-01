import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, ListGroup, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import TablePagination from '../../components/reports/TablePagination';
import { createAssignment, updateAssignment } from '../../api/assignmentApi';
import { useAssignment } from '../../hooks/useAssignments';
import { useExams } from '../../hooks/useExams';
import { useGroups } from '../../hooks/useGroups';
import { useQuestionCountsByExam } from '../../hooks/useQuestions';
import { useUsers } from '../../hooks/useUsers';
import type { AssignmentTargetType, ExamAssignmentResponse } from '../../types/assignment';
import { extractServerError } from '../../utils/apiError';

type WizardStep = 1 | 2 | 3 | 4;

const EXAMS_PAGE_SIZE = 10;

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function StepCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface StatusIconProps {
  ok: boolean;
}

function StatusIcon({ ok }: StatusIconProps) {
  return ok ? <CheckIcon /> : <XIcon />;
}

const TIME_ZONES = [
  'UTC',
  '(UTC+05:30) Asia/Kolkata',
  '(UTC-05:00) America/New_York',
  '(UTC+00:00) Europe/London',
  '(UTC+01:00) Europe/Berlin',
  '(UTC+08:00) Asia/Singapore',
  '(UTC+10:00) Australia/Sydney',
];

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}


export default function AssignExam() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id: assignmentId } = useParams<{ id: string }>();
  const isEditMode = !!assignmentId;
  const { data: existingAssignment, isLoading: assignmentLoading, isError: assignmentError } =
    useAssignment(assignmentId);
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: groups } = useGroups();
  const { data: users } = useUsers();
  const questionCounts = useQuestionCountsByExam(exams?.map((e) => e.id));

  const [step, setStep] = useState<WizardStep>(1);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(searchParams.get('examId'));
  const [prefilled, setPrefilled] = useState(false);
  const [showExamFilters, setShowExamFilters] = useState(false);
  const [examCategoryFilter, setExamCategoryFilter] = useState('All');
  const [examPage, setExamPage] = useState(1);

  const [targetType, setTargetType] = useState<AssignmentTargetType>('Students');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [pickedAvailable, setPickedAvailable] = useState<string[]>([]);
  const [pickedSelected, setPickedSelected] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [startAtLocal, setStartAtLocal] = useState(toDatetimeLocalValue(now));
  const [endAtLocal, setEndAtLocal] = useState(toDatetimeLocalValue(inOneDay));
  const [timeZoneId, setTimeZoneId] = useState(TIME_ZONES[1]);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowLateJoin, setAllowLateJoin] = useState(true);
  const [graceTimeMinutes, setGraceTimeMinutes] = useState(10);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showResultsAfterSubmit, setShowResultsAfterSubmit] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [allowReviewAfterSubmit, setAllowReviewAfterSubmit] = useState(false);
  const [autoSubmitOnTimeOver, setAutoSubmitOnTimeOver] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(false);
  // Only meaningful when enableProctoring is on - detection itself always
  // runs client-side, this just gates whether the camera ever gets
  // published anywhere for admins to watch. Forced off whenever proctoring
  // is off (see the toggle handler below) so the two can't disagree.
  const [enableLiveVideo, setEnableLiveVideo] = useState(false);

  const [createdAssignment, setCreatedAssignment] = useState<ExamAssignmentResponse | null>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isEditMode || !existingAssignment || prefilled) {
      return;
    }
    setSelectedExamId(existingAssignment.examId);
    setTargetType(existingAssignment.targetType);
    setSelectedStudentIds(
      existingAssignment.targetType === 'Students' ? existingAssignment.targetUserIds : [],
    );
    setSelectedGroupId(existingAssignment.groupId);
    setStartAtLocal(toDatetimeLocalValue(new Date(existingAssignment.startAtUtc)));
    setEndAtLocal(toDatetimeLocalValue(new Date(existingAssignment.endAtUtc)));
    setTimeZoneId(existingAssignment.timeZoneId);
    setMaxAttempts(existingAssignment.maxAttempts);
    setAllowLateJoin(existingAssignment.allowLateJoin);
    setGraceTimeMinutes(existingAssignment.graceTimeMinutes);
    setShowInstructions(existingAssignment.showInstructions);
    setShowResultsAfterSubmit(existingAssignment.showResultsAfterSubmit);
    setShowCorrectAnswers(existingAssignment.showCorrectAnswers);
    setAllowReviewAfterSubmit(existingAssignment.allowReviewAfterSubmit);
    setAutoSubmitOnTimeOver(existingAssignment.autoSubmitOnTimeOver);
    setEnableProctoring(existingAssignment.enableProctoring);
    setEnableLiveVideo(existingAssignment.enableLiveVideo);
    setStep(2);
    setPrefilled(true);
  }, [isEditMode, existingAssignment, prefilled]);

  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);
  // Only Published exams are assignable - an assignment on a Draft/Archived
  // exam would be silently invisible to students, so it's excluded here
  // rather than allowed through and failing at submit time.
  const publishableExams = useMemo(() => (exams ?? []).filter((e) => e.status === 'Published'), [exams]);
  // In edit mode the exam is locked and may no longer be Published (status
  // can change after the assignment was created), so look it up from the
  // unfiltered list rather than publishableExams.
  const selectedExam = isEditMode
    ? (exams ?? []).find((e) => e.id === selectedExamId) ?? null
    : publishableExams.find((e) => e.id === selectedExamId) ?? null;
  const selectedGroup = (groups ?? []).find((g) => g.id === selectedGroupId) ?? null;

  const examCategories = useMemo(
    () => [...new Set(publishableExams.map((e) => e.category).filter(Boolean))],
    [publishableExams],
  );

  const filteredExams = publishableExams.filter((e) => {
    if (!e.title.toLowerCase().includes(examSearch.trim().toLowerCase())) return false;
    if (examCategoryFilter !== 'All' && e.category !== examCategoryFilter) return false;
    return true;
  });

  useEffect(() => {
    setExamPage(1);
  }, [examSearch, examCategoryFilter]);

  const examTotalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PAGE_SIZE));
  const examCurrentPage = Math.min(examPage, examTotalPages);
  const pagedExams = filteredExams.slice(
    (examCurrentPage - 1) * EXAMS_PAGE_SIZE,
    examCurrentPage * EXAMS_PAGE_SIZE,
  );
  const examRangeStart = filteredExams.length === 0 ? 0 : (examCurrentPage - 1) * EXAMS_PAGE_SIZE + 1;
  const examRangeEnd = Math.min(examCurrentPage * EXAMS_PAGE_SIZE, filteredExams.length);

  const availableStudents = students.filter(
    (s) => !selectedStudentIds.includes(s.id) && s.fullName.toLowerCase().includes(studentSearch.trim().toLowerCase()),
  );
  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const moveToSelected = () => {
    setSelectedStudentIds((prev) => [...new Set([...prev, ...pickedAvailable])]);
    setPickedAvailable([]);
  };
  const moveToAvailable = () => {
    setSelectedStudentIds((prev) => prev.filter((id) => !pickedSelected.includes(id)));
    setPickedSelected([]);
  };
  const moveAllToSelected = () => {
    setSelectedStudentIds(students.map((s) => s.id));
    setPickedAvailable([]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createAssignment({
        examId: selectedExamId!,
        targetType,
        userIds: targetType === 'Students' ? selectedStudentIds : null,
        groupId: targetType === 'Batch' ? selectedGroupId : null,
        startAtUtc: new Date(startAtLocal).toISOString(),
        endAtUtc: new Date(endAtLocal).toISOString(),
        timeZoneId,
        maxAttempts,
        allowLateJoin,
        graceTimeMinutes,
        showInstructions,
        showResultsAfterSubmit,
        showCorrectAnswers,
        allowReviewAfterSubmit,
        autoSubmitOnTimeOver,
        enableProctoring,
        enableLiveVideo: enableProctoring && enableLiveVideo,
      }),
    onSuccess: (assignment) => {
      setSubmitError('');
      setCreatedAssignment(assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error) => setSubmitError(extractServerError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAssignment(assignmentId!, {
        targetType,
        userIds: targetType === 'Students' ? selectedStudentIds : null,
        groupId: targetType === 'Batch' ? selectedGroupId : null,
        startAtUtc: new Date(startAtLocal).toISOString(),
        endAtUtc: new Date(endAtLocal).toISOString(),
        timeZoneId,
        maxAttempts,
        allowLateJoin,
        graceTimeMinutes,
        showInstructions,
        showResultsAfterSubmit,
        showCorrectAnswers,
        allowReviewAfterSubmit,
        autoSubmitOnTimeOver,
        enableProctoring,
        enableLiveVideo: enableProctoring && enableLiveVideo,
      }),
    onSuccess: (assignment) => {
      setSubmitError('');
      setCreatedAssignment(assignment);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId] });
    },
    onError: (error) => setSubmitError(extractServerError(error)),
  });

  const saveMutation = isEditMode ? updateMutation : createMutation;

  const canProceedFromStep1 = !!selectedExam;
  const canProceedFromStep2 =
    (targetType === 'Students' && selectedStudentIds.length > 0) ||
    (targetType === 'Batch' && !!selectedGroupId) ||
    targetType === 'AllStudents';

  const resetWizard = () => {
    setStep(1);
    setSelectedExamId(null);
    setTargetType('Students');
    setSelectedStudentIds([]);
    setSelectedGroupId(null);
    setCreatedAssignment(null);
    setSubmitError('');
  };

  const stepLabels: { step: WizardStep; label: string }[] = [
    { step: 1, label: 'Select Exam' },
    { step: 2, label: 'Select Students / Batch' },
    { step: 3, label: 'Schedule & Settings' },
    { step: 4, label: 'Review & Confirm' },
  ];

  if (isEditMode && (assignmentLoading || !prefilled) && !assignmentError) {
    return (
      <AdminLayout active="Exams">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  if (isEditMode && assignmentError) {
    return (
      <AdminLayout active="Exams">
        <div className="text-center text-muted py-5">
          Couldn't load this assignment.{' '}
          <Link to="/admin/exams">Back to Exams</Link>
        </div>
      </AdminLayout>
    );
  }

  if (createdAssignment) {
    return (
      <AdminLayout active="Exams">
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
          <Card.Body className="p-4 text-center">
            <div
              className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64, fontSize: 32 }}
            >
              &#10003;
            </div>
            <h2 className="h5 fw-bold mb-1">
              {isEditMode ? 'Assignment Updated Successfully!' : 'Exam Assigned Successfully!'}
            </h2>
            <p className="text-muted mb-4">
              {isEditMode
                ? 'The assignment has been updated.'
                : 'The exam has been assigned to the selected students.'}
            </p>

            <div className="text-start border rounded-3 p-3 mb-4">
              <Row className="mb-2">
                <Col xs={6} className="text-muted">
                  Assignment ID
                </Col>
                <Col xs={6} className="fw-medium">
                  ASG-{createdAssignment.assignmentNumber}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col xs={6} className="text-muted">
                  Exam
                </Col>
                <Col xs={6} className="fw-medium">
                  {selectedExam?.title}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col xs={6} className="text-muted">
                  Assigned To
                </Col>
                <Col xs={6} className="fw-medium">
                  {targetType === 'Students' && `${createdAssignment.targetUserIds.length} Students`}
                  {targetType === 'Batch' && `Batch: ${selectedGroup?.name ?? ''}`}
                  {targetType === 'AllStudents' && `All Students (${createdAssignment.targetUserIds.length})`}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col xs={6} className="text-muted">
                  Start Date &amp; Time
                </Col>
                <Col xs={6} className="fw-medium">
                  {new Date(createdAssignment.startAtUtc).toLocaleString()}
                </Col>
              </Row>
              <Row>
                <Col xs={6} className="text-muted">
                  End Date &amp; Time
                </Col>
                <Col xs={6} className="fw-medium">
                  {new Date(createdAssignment.endAtUtc).toLocaleString()}
                </Col>
              </Row>
            </div>

            <div className="d-flex gap-2 justify-content-center">
              {!isEditMode && (
                <Button variant="outline-secondary" onClick={resetWizard}>
                  Assign Another Exam
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => navigate(`/admin/exams/${createdAssignment.examId}`)}
              >
                View Exam
              </Button>
            </div>
          </Card.Body>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Exams">
      <h1 className="h4 fw-bold mb-1 text-primary">{isEditMode ? 'Edit Assignment' : 'Assign Exam'}</h1>
      <p className="text-muted mb-4">
        {isEditMode
          ? 'Update the target, schedule, or settings for this assignment.'
          : 'Assign an exam to students or batches.'}
      </p>

      <div className="d-flex align-items-center mb-4">
        {stepLabels.map(({ step: s, label }, i) => {
          const isDone = s < step;
          const isActive = s === step;
          return (
            <div key={s} className="d-flex align-items-center" style={{ flex: i === stepLabels.length - 1 ? '0 0 auto' : '1 1 auto' }}>
              <div className="d-flex align-items-center gap-2 text-nowrap">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 13,
                    background: isDone ? '#198754' : isActive ? '#4f46e5' : '#e9ecef',
                    color: isDone || isActive ? 'white' : '#6c757d',
                  }}
                >
                  {isDone ? <StepCheckIcon /> : s}
                </div>
                <span
                  className="small"
                  style={{ color: isActive ? '#4f46e5' : isDone ? '#198754' : '#6c757d', fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="flex-grow-1 mx-2" style={{ height: 2, background: isDone ? '#198754' : '#e9ecef' }} />
              )}
            </div>
          );
        })}
      </div>

      {submitError && <Alert variant="danger">{submitError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {step === 1 && isEditMode && (
            <>
              <h2 className="h6 fw-bold mb-3">Exam</h2>
              <Alert variant="secondary" className="mb-0">
                <div className="fw-medium">{selectedExam?.title}</div>
                <div className="small text-muted mt-1">
                  The exam for an assignment can't be changed after it's created. Delete this
                  assignment and create a new one to assign a different exam.
                </div>
              </Alert>
            </>
          )}

          {step === 1 && !isEditMode && (
            <>
              <h2 className="h6 fw-bold mb-1">Select Exam</h2>
              <p className="text-muted small mb-3">Choose an exam to assign to students or batches.</p>
              <div className="d-flex gap-2 mb-3">
                <InputGroup>
                  <InputGroup.Text><SearchIcon /></InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search exam by title or keyword..."
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                  />
                </InputGroup>
                <Button
                  variant={showExamFilters ? 'secondary' : 'outline-secondary'}
                  className="d-flex align-items-center gap-2 text-nowrap"
                  onClick={() => setShowExamFilters((v) => !v)}
                >
                  <FilterIcon /> Filters
                </Button>
              </div>
              {showExamFilters && (
                <Row className="g-2 mb-3">
                  <Col md={4}>
                    <Form.Select
                      size="sm"
                      value={examCategoryFilter}
                      onChange={(e) => setExamCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {examCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              )}
              {examsLoading ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <>
                <Table hover className="align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th></th>
                      <th>Exam Title</th>
                      <th>Creation Method</th>
                      <th>Total Questions</th>
                      <th>Duration</th>
                      <th>Total Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedExams.map((exam) => (
                      <tr
                        key={exam.id}
                        role="button"
                        onClick={() => setSelectedExamId(exam.id)}
                        className={exam.id === selectedExamId ? 'table-primary' : ''}
                      >
                        <td>
                          <Form.Check
                            type="radio"
                            checked={exam.id === selectedExamId}
                            onChange={() => setSelectedExamId(exam.id)}
                          />
                        </td>
                        <td>
                          <div className="fw-medium">{exam.title}</div>
                          {exam.category && (
                            <span className="badge bg-light text-dark border mt-1">{exam.category}</span>
                          )}
                        </td>
                        <td>{exam.creationMethod === 'AiGenerated' ? 'AI Generated' : 'Manual'}</td>
                        <td>{questionCounts[exam.id] ?? exam.totalQuestions}</td>
                        <td>{exam.durationMinutes} min</td>
                        <td>{exam.totalMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {filteredExams.length > 0 && (
                  <TablePagination
                    page={examCurrentPage}
                    totalPages={examTotalPages}
                    rangeStart={examRangeStart}
                    rangeEnd={examRangeEnd}
                    totalCount={filteredExams.length}
                    onPageChange={setExamPage}
                  />
                )}
                </>
              )}
              {!examsLoading && publishableExams.length === 0 && (
                <div className="text-center text-muted py-4">
                  No published exams yet. Publish an exam under Exam Review &amp; Publish before assigning it.
                </div>
              )}
              {!examsLoading && publishableExams.length > 0 && filteredExams.length === 0 && (
                <div className="text-center text-muted py-4">No exams match your search.</div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-muted mb-3">Choose students or batches to assign the exam.</p>
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link active={targetType === 'Students'} onClick={() => setTargetType('Students')}>
                    Students
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link active={targetType === 'Batch'} onClick={() => setTargetType('Batch')}>
                    Batch
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link active={targetType === 'AllStudents'} onClick={() => setTargetType('AllStudents')}>
                    All Students
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              {targetType === 'Students' && (
                <Row className="g-3">
                  <Col md={5}>
                    <div className="fw-medium small mb-2">Available Students ({availableStudents.length})</div>
                    <InputGroup className="mb-2">
                      <InputGroup.Text><SearchIcon /></InputGroup.Text>
                      <Form.Control
                        type="search"
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </InputGroup>
                    <ListGroup style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {availableStudents.map((s) => (
                        <ListGroup.Item
                          key={s.id}
                          action
                          active={pickedAvailable.includes(s.id)}
                          onClick={() =>
                            setPickedAvailable((prev) =>
                              prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                            )
                          }
                        >
                          <Form.Check
                            type="checkbox"
                            readOnly
                            checked={pickedAvailable.includes(s.id)}
                            label={`${s.fullName}`}
                          />
                        </ListGroup.Item>
                      ))}
                      {availableStudents.length === 0 && (
                        <div className="text-center text-muted small py-3">No students available.</div>
                      )}
                    </ListGroup>
                    <Form.Check
                      type="checkbox"
                      label="Select All"
                      className="mt-2"
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        e.target.checked ? moveAllToSelected() : setSelectedStudentIds([])
                      }
                    />
                  </Col>
                  <Col md={2} className="d-flex flex-column align-items-center justify-content-center gap-2">
                    <Button
                      variant="outline-secondary"
                      onClick={moveToSelected}
                      disabled={pickedAvailable.length === 0}
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={moveToAvailable}
                      disabled={pickedSelected.length === 0}
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </Button>
                  </Col>
                  <Col md={5}>
                    <div className="fw-medium small mb-2">Selected Students ({selectedStudents.length})</div>
                    {selectedStudents.length === 0 ? (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center text-center border rounded-3 p-4"
                        style={{ minHeight: 280, background: '#f8f9ff' }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                          style={{ width: 72, height: 72, background: '#eef2ff' }}
                        >
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="fw-bold small">No students selected</div>
                        <div className="text-muted small">Choose students from the list to assign the exam.</div>
                      </div>
                    ) : (
                    <ListGroup style={{ maxHeight: 280, overflowY: 'auto', minHeight: 40 }}>
                      {selectedStudents.map((s) => (
                        <ListGroup.Item
                          key={s.id}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <Form.Check
                            type="checkbox"
                            readOnly
                            checked={pickedSelected.includes(s.id)}
                            label={s.fullName}
                            onClick={() =>
                              setPickedSelected((prev) =>
                                prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                              )
                            }
                          />
                          <Button
                            variant="link"
                            size="sm"
                            className="text-danger p-0"
                            onClick={() => setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id))}
                          >
                            &times;
                          </Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                    )}
                  </Col>
                </Row>
              )}

              {targetType === 'Batch' && (
                <Row>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Select Batch / Group</Form.Label>
                      <Form.Select
                        value={selectedGroupId ?? ''}
                        onChange={(e) => setSelectedGroupId(e.target.value || null)}
                      >
                        <option value="">Choose a group...</option>
                        {(groups ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.memberCount} members)
                          </option>
                        ))}
                      </Form.Select>
                      {(groups ?? []).length === 0 && (
                        <div className="form-text">
                          No groups exist yet. <Link to="/admin/users/groups">Create one</Link>.
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {targetType === 'AllStudents' && (
                <Alert variant="info" className="mb-0">
                  This exam will be assigned to all {students.length} student account(s) currently in the system.
                </Alert>
              )}
            </>
          )}

          {step === 3 && (
            <Row className="g-4">
              <Col md={6} className="pe-md-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{ width: 32, height: 32, background: '#eef2ff' }}
                  >
                    <CalendarIcon />
                  </div>
                  <h2 className="h6 fw-bold mb-0">Schedule</h2>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date &amp; Time</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><CalendarIcon /></InputGroup.Text>
                    <Form.Control
                      type="datetime-local"
                      value={startAtLocal}
                      onChange={(e) => setStartAtLocal(e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>End Date &amp; Time</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><CalendarIcon /></InputGroup.Text>
                    <Form.Control
                      type="datetime-local"
                      value={endAtLocal}
                      onChange={(e) => setEndAtLocal(e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Time Zone</Form.Label>
                  <Form.Select value={timeZoneId} onChange={(e) => setTimeZoneId(e.target.value)}>
                    {TIME_ZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Attempts</Form.Label>
                  <Form.Select value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}>
                    {[1, 2, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Check
                  type="switch"
                  id="allowLateJoin"
                  label="Allow Late Join"
                  checked={allowLateJoin}
                  onChange={(e) => setAllowLateJoin(e.target.checked)}
                />
                <div className="form-text mb-2">Students can start the exam after start time</div>
                {allowLateJoin && (
                  <Form.Group style={{ maxWidth: 200 }}>
                    <Form.Label className="small">Grace Time (after start), minutes</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={graceTimeMinutes}
                      onChange={(e) => setGraceTimeMinutes(Number(e.target.value))}
                    />
                  </Form.Group>
                )}
              </Col>
              <Col md={6} className="ps-md-4 border-start">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                    style={{ width: 32, height: 32, background: '#eef2ff' }}
                  >
                    <GearIcon />
                  </div>
                  <h2 className="h6 fw-bold mb-0">More Settings</h2>
                </div>
                <div className="d-flex flex-column gap-3">
                  <Form.Check
                    type="switch"
                    id="showInstructions"
                    label="Show Exam Instructions"
                    checked={showInstructions}
                    onChange={(e) => setShowInstructions(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="showResults"
                    label="Show Results After Submit"
                    checked={showResultsAfterSubmit}
                    onChange={(e) => setShowResultsAfterSubmit(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="showCorrectAnswers"
                    label="Show Correct Answers"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="allowReview"
                    label="Allow Review After Submit"
                    checked={allowReviewAfterSubmit}
                    onChange={(e) => setAllowReviewAfterSubmit(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="autoSubmit"
                    label="Auto Submit on Time Over"
                    checked={autoSubmitOnTimeOver}
                    onChange={(e) => setAutoSubmitOnTimeOver(e.target.checked)}
                  />
                  <Form.Check
                    type="switch"
                    id="enableProctoring"
                    label="Enable Proctoring"
                    checked={enableProctoring}
                    onChange={(e) => {
                      setEnableProctoring(e.target.checked);
                      if (!e.target.checked) {
                        setEnableLiveVideo(false);
                      }
                    }}
                  />
                  <Form.Check
                    type="switch"
                    id="enableLiveVideo"
                    label="Allow Live Video Feed"
                    className="ms-4 mt-1"
                    checked={enableLiveVideo}
                    disabled={!enableProctoring}
                    onChange={(e) => setEnableLiveVideo(e.target.checked)}
                  />
                  <div className="form-text ms-4">
                    Lets an admin watch this student's camera live during the exam. Face-detection and
                    tab/window monitoring above work either way - this only controls whether the camera is
                    ever published for watching.
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {step === 4 && selectedExam && (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                  style={{ width: 32, height: 32, background: '#eef2ff' }}
                >
                  <DocumentIcon />
                </div>
                <h2 className="h6 fw-bold mb-0">Review assignment details before confirming.</h2>
              </div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Card className="border h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <DocumentIcon />
                        <div className="fw-bold small text-uppercase text-muted">Exam Details</div>
                      </div>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Exam Title
                        </Col>
                        <Col xs={6}>{selectedExam.title}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Creation Method
                        </Col>
                        <Col xs={6}>{selectedExam.creationMethod === 'AiGenerated' ? 'AI Generated' : 'Manual'}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Total Questions
                        </Col>
                        <Col xs={6}>{questionCounts[selectedExam.id] ?? selectedExam.totalQuestions}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Duration
                        </Col>
                        <Col xs={6}>{selectedExam.durationMinutes} Minutes</Col>
                      </Row>
                      <Row>
                        <Col xs={6} className="text-muted small">
                          Total Marks
                        </Col>
                        <Col xs={6}>{selectedExam.totalMarks}</Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <PeopleIcon />
                        <div className="fw-bold small text-uppercase text-muted">Assignment Details</div>
                      </div>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Assign To
                        </Col>
                        <Col xs={6}>
                          {targetType === 'Students' && `${selectedStudentIds.length} Students`}
                          {targetType === 'Batch' && `Batch: ${selectedGroup?.name ?? ''}`}
                          {targetType === 'AllStudents' && `All Students (${students.length})`}
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Start Date &amp; Time
                        </Col>
                        <Col xs={6}>{new Date(startAtLocal).toLocaleString()}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          End Date &amp; Time
                        </Col>
                        <Col xs={6}>{new Date(endAtLocal).toLocaleString()}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Maximum Attempts
                        </Col>
                        <Col xs={6}>{maxAttempts}</Col>
                      </Row>
                      <Row>
                        <Col xs={6} className="text-muted small">
                          Time Zone
                        </Col>
                        <Col xs={6}>{timeZoneId}</Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="border">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <GearIcon />
                    <div className="fw-bold small text-uppercase text-muted">Settings Summary</div>
                  </div>
                  <Row>
                    <Col md={6}>
                      {[
                        ['Show Instructions', showInstructions],
                        ['Show Results After Submit', showResultsAfterSubmit],
                        ['Show Correct Answers', showCorrectAnswers],
                        ['Allow Review After Submit', allowReviewAfterSubmit],
                      ].map(([label, value]) => (
                        <div key={label as string} className="d-flex justify-content-between align-items-center border-bottom py-2">
                          <span>{label}</span>
                          <StatusIcon ok={value as boolean} />
                        </div>
                      ))}
                    </Col>
                    <Col md={6} className="ps-md-4 border-start">
                      {[
                        ['Allow Late Join', allowLateJoin],
                        ['Auto Submit on Time Over', autoSubmitOnTimeOver],
                        ['Enable Proctoring', enableProctoring],
                        ['Allow Live Video Feed', enableProctoring && enableLiveVideo],
                      ].map(([label, value]) => (
                        <div key={label as string} className="d-flex justify-content-between align-items-center border-bottom py-2">
                          <span>{label}</span>
                          <StatusIcon ok={value as boolean} />
                        </div>
                      ))}
                      {allowLateJoin && (
                        <div className="d-flex justify-content-between align-items-center py-2">
                          <span>Grace Time (after start)</span>
                          <span className="fw-medium">{graceTimeMinutes} minutes</span>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between mt-3">
        <div>
          {step > 1 && (
            <Button variant="outline-secondary" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
              &larr; Back
            </Button>
          )}
        </div>
        <div>
          {step < 4 && (
            <Button
              variant="primary"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={(step === 1 && !canProceedFromStep1) || (step === 2 && !canProceedFromStep2)}
            >
              Next &rarr;
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="success"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="d-flex align-items-center gap-2"
            >
              {!saveMutation.isPending && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {saveMutation.isPending
                ? isEditMode
                  ? 'Saving...'
                  : 'Assigning...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Confirm & Assign'}
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
