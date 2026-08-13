import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { createAssignment } from '../../api/assignmentApi';
import { useExams } from '../../hooks/useExams';
import { useGroups } from '../../hooks/useGroups';
import { useUsers } from '../../hooks/useUsers';
import type { AssignmentTargetType, ExamAssignmentResponse } from '../../types/assignment';

type WizardStep = 1 | 2 | 3 | 4;

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

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) {
      return Object.values(validationErrors).flat().join(' ');
    }
    if (error.response?.status === 404) {
      return 'The selected exam or group could not be found.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export default function AssignExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: groups } = useGroups();
  const { data: users } = useUsers();

  const [step, setStep] = useState<WizardStep>(1);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(searchParams.get('examId'));

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

  const [createdAssignment, setCreatedAssignment] = useState<ExamAssignmentResponse | null>(null);
  const [submitError, setSubmitError] = useState('');

  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);
  const selectedExam = (exams ?? []).find((e) => e.id === selectedExamId) ?? null;
  const selectedGroup = (groups ?? []).find((g) => g.id === selectedGroupId) ?? null;

  const filteredExams = (exams ?? []).filter((e) =>
    e.title.toLowerCase().includes(examSearch.trim().toLowerCase()),
  );

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
      }),
    onSuccess: (assignment) => {
      setSubmitError('');
      setCreatedAssignment(assignment);
    },
    onError: (error) => setSubmitError(extractServerError(error)),
  });

  const canProceedFromStep1 = !!selectedExamId;
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

  if (createdAssignment) {
    return (
      <AdminLayout active="Assignments">
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 560 }}>
          <Card.Body className="p-4 text-center">
            <div
              className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64, fontSize: 32 }}
            >
              &#10003;
            </div>
            <h2 className="h5 fw-bold mb-1">Exam Assigned Successfully!</h2>
            <p className="text-muted mb-4">The exam has been assigned to the selected students.</p>

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
              <Button variant="outline-secondary" onClick={resetWizard}>
                Assign Another Exam
              </Button>
              <Button variant="primary" onClick={() => navigate('/admin/assignments')}>
                View Assignments
              </Button>
            </div>
          </Card.Body>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Assignments">
      <h1 className="h4 fw-bold mb-1 text-primary">Assign Exam</h1>
      <p className="text-muted mb-4">Assign an exam to students or batches.</p>

      <Nav variant="pills" className="mb-4 gap-2">
        {stepLabels.map(({ step: s, label }) => (
          <Nav.Item key={s}>
            <Nav.Link active={step === s} disabled className="text-nowrap" style={step === s ? {} : { opacity: 0.6 }}>
              {s}. {label}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {submitError && <Alert variant="danger">{submitError}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {step === 1 && (
            <>
              <h2 className="h6 fw-bold mb-3">Select Exam</h2>
              <Form.Control
                type="search"
                placeholder="Search exam..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="mb-3"
              />
              {examsLoading ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <Table hover className="align-middle">
                  <thead className="text-muted small text-uppercase bg-light">
                    <tr>
                      <th></th>
                      <th>Exam Title</th>
                      <th>Type</th>
                      <th>Total Questions</th>
                      <th>Duration</th>
                      <th>Total Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((exam) => (
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
                        <td>{exam.title}</td>
                        <td>{exam.examType === 'AiGenerated' ? 'AI Generated' : 'Manual'}</td>
                        <td>{exam.totalQuestions}</td>
                        <td>{exam.durationMinutes} min</td>
                        <td>{exam.totalMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {!examsLoading && filteredExams.length === 0 && (
                <div className="text-center text-muted py-4">No exams match your search.</div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="h6 fw-bold mb-3">Choose students or batches to assign the exam.</h2>
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
                    <div className="fw-medium small mb-2">Available Students</div>
                    <Form.Control
                      type="search"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="mb-2"
                    />
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
                    <Button variant="outline-secondary" size="sm" onClick={moveToSelected} disabled={pickedAvailable.length === 0}>
                      &gt;
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={moveToAvailable} disabled={pickedSelected.length === 0}>
                      &lt;
                    </Button>
                  </Col>
                  <Col md={5}>
                    <div className="fw-medium small mb-2">Selected Students ({selectedStudents.length})</div>
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
              <Col md={6}>
                <h2 className="h6 fw-bold mb-3">Schedule</h2>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date &amp; Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={startAtLocal}
                    onChange={(e) => setStartAtLocal(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>End Date &amp; Time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={endAtLocal}
                    onChange={(e) => setEndAtLocal(e.target.value)}
                  />
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
              <Col md={6}>
                <h2 className="h6 fw-bold mb-3">More Settings</h2>
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
                    onChange={(e) => setEnableProctoring(e.target.checked)}
                  />
                </div>
              </Col>
            </Row>
          )}

          {step === 4 && selectedExam && (
            <>
              <h2 className="h6 fw-bold mb-3">Review assignment details before confirming.</h2>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Card className="border h-100">
                    <Card.Body>
                      <div className="fw-bold small text-uppercase text-muted mb-2">Exam Details</div>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Exam Title
                        </Col>
                        <Col xs={6}>{selectedExam.title}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Type
                        </Col>
                        <Col xs={6}>{selectedExam.examType === 'AiGenerated' ? 'AI Generated' : 'Manual'}</Col>
                      </Row>
                      <Row className="mb-2">
                        <Col xs={6} className="text-muted small">
                          Total Questions
                        </Col>
                        <Col xs={6}>{selectedExam.totalQuestions}</Col>
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
                      <div className="fw-bold small text-uppercase text-muted mb-2">Assignment Details</div>
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

              <Row className="g-3">
                <Col md={6}>
                  <Card className="border">
                    <Card.Body>
                      <div className="fw-bold small text-uppercase text-muted mb-2">Settings Summary</div>
                      {[
                        ['Show Instructions', showInstructions],
                        ['Show Results', showResultsAfterSubmit],
                        ['Show Correct Answers', showCorrectAnswers],
                        ['Allow Review After Submit', allowReviewAfterSubmit],
                      ].map(([label, value]) => (
                        <div key={label as string} className="d-flex justify-content-between border-bottom py-1">
                          <span>{label}</span>
                          <span className={value ? 'text-success' : 'text-danger'}>{value ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border">
                    <Card.Body>
                      <div className="fw-bold small text-uppercase text-muted mb-2">&nbsp;</div>
                      {[
                        ['Allow Late Join', allowLateJoin],
                        ['Auto Submit on Time Over', autoSubmitOnTimeOver],
                        ['Enable Proctoring', enableProctoring],
                      ].map(([label, value]) => (
                        <div key={label as string} className="d-flex justify-content-between border-bottom py-1">
                          <span>{label}</span>
                          <span className={value ? 'text-success' : 'text-danger'}>{value ? '✓' : '✗'}</span>
                        </div>
                      ))}
                      {allowLateJoin && (
                        <div className="d-flex justify-content-between py-1">
                          <span>Grace Time</span>
                          <span>{graceTimeMinutes} minutes</span>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
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
            <Button variant="success" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Assigning...' : 'Confirm & Assign'}
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
