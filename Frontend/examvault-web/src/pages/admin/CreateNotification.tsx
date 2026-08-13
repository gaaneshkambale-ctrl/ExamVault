import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { createNotification } from '../../api/notificationApi';
import { NOTIFICATION_TYPES } from '../../types/notification';
import type { CreateNotificationResponse, NotificationSendToType, NotificationType } from '../../types/notification';

function extractServerError(error: unknown): string {
  if (isAxiosError(error)) {
    const validationErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (validationErrors) return Object.values(validationErrors).flat().join(' ');
    if (error.response?.data?.detail) return error.response.data.detail as string;
  }
  return 'Something went wrong. Please try again.';
}

function toDatetimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CreateNotification() {
  const { data: exams } = useExams();
  const { data: users } = useUsers();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('System');
  const [sendTo, setSendTo] = useState<NotificationSendToType>('AllStudents');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [relatedExamId, setRelatedExamId] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 60 * 60_000)));
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<CreateNotificationResponse | null>(null);

  const publishedExams = useMemo(() => (exams ?? []).filter((e) => e.status === 'Published'), [exams]);
  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);
  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(studentSearch.trim().toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createNotification({
        title,
        message,
        type,
        sendTo,
        userIds: sendTo === 'SelectedStudents' ? Array.from(selectedUserIds) : null,
        relatedExamId: relatedExamId || null,
        sendNow,
        scheduledAtUtc: sendNow ? null : new Date(scheduledAt).toISOString(),
      }),
    onSuccess: (response) => {
      setSubmitError('');
      setCreated(response);
    },
    onError: (error) => setSubmitError(extractServerError(error)),
  });

  const toggleStudent = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (sendTo !== 'SelectedStudents' || selectedUserIds.size > 0) &&
    (sendTo !== 'ExamCandidates' || !!relatedExamId);

  if (created) {
    return (
      <AdminLayout active="Create Notification">
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-5 text-center">
            <div className="display-6 text-success mb-3">&#10003;</div>
            <h1 className="h4 fw-bold mb-2">Notification Sent</h1>
            <p className="text-muted mb-4">
              Delivered to {created.recipientCount} recipient{created.recipientCount === 1 ? '' : 's'}.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <Link to={`/admin/notifications/history/${created.batchId}`} className="btn btn-primary">
                View Details
              </Link>
              <Link to="/admin/notifications/history" className="btn btn-outline-secondary">
                Go to History
              </Link>
            </div>
          </Card.Body>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Create Notification">
      <h1 className="h4 fw-bold mb-1 text-primary">Create Notification</h1>
      <p className="text-muted mb-4">Compose and send a notification to students or admins.</p>

      {submitError && (
        <Alert variant="danger" onClose={() => setSubmitError('')} dismissible>
          {submitError}
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Notification Title</Form.Label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
                maxLength={200}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                maxLength={2000}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Notification Type</Form.Label>
                  <Form.Select value={type} onChange={(e) => setType(e.target.value as NotificationType)}>
                    {NOTIFICATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Related Exam {sendTo !== 'ExamCandidates' && '(Optional)'}</Form.Label>
                  <Form.Select value={relatedExamId} onChange={(e) => setRelatedExamId(e.target.value)}>
                    <option value="">Select Exam</option>
                    {publishedExams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Send To</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {(
                  [
                    ['AllStudents', 'All Students'],
                    ['SelectedStudents', 'Selected Students'],
                    ['ExamCandidates', 'Specific Exam Candidates'],
                    ['Admins', 'Admins'],
                  ] as Array<[NotificationSendToType, string]>
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={sendTo === value ? 'primary' : 'outline-secondary'}
                    onClick={() => setSendTo(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Form.Group>

            {sendTo === 'SelectedStudents' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Students ({selectedUserIds.size} selected)</Form.Label>
                <Form.Control
                  type="search"
                  className="mb-2"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <ListGroup style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {filteredStudents.length === 0 && (
                    <ListGroup.Item className="text-muted small">No students found.</ListGroup.Item>
                  )}
                  {filteredStudents.map((student) => (
                    <ListGroup.Item key={student.id}>
                      <Form.Check
                        type="checkbox"
                        label={`${student.fullName} (${student.email})`}
                        checked={selectedUserIds.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Form.Group>
            )}

            <Form.Group className="mb-4">
              <Form.Label>Send Now or Schedule</Form.Label>
              <div className="d-flex align-items-center gap-4">
                <Form.Check
                  type="radio"
                  id="send-now"
                  name="send-timing"
                  label="Send Now"
                  checked={sendNow}
                  onChange={() => setSendNow(true)}
                />
                <Form.Check
                  type="radio"
                  id="schedule-later"
                  name="send-timing"
                  label="Schedule For Later"
                  checked={!sendNow}
                  onChange={() => setSendNow(false)}
                />
              </div>
              {!sendNow && (
                <Form.Control
                  type="datetime-local"
                  className="mt-2"
                  style={{ maxWidth: 280 }}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={toDatetimeLocalValue(new Date())}
                />
              )}
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" disabled={!canSubmit || createMutation.isPending}>
                {createMutation.isPending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
