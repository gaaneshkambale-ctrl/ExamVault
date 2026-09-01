import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { useExams } from '../../hooks/useExams';
import { useUsers } from '../../hooks/useUsers';
import { useGroups } from '../../hooks/useGroups';
import { useNotificationTemplates } from '../../hooks/useNotifications';
import { getGroup } from '../../api/groupApi';
import { createNotification } from '../../api/notificationApi';
import type { CreateNotificationResponse, NotificationSendToType } from '../../types/notification';
import { containsExamFieldPlaceholder, substituteExamFields } from '../../utils/notificationTemplates';
import { extractServerError } from '../../utils/apiError';

function ComposerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function OptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SendIconHeader() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function toDatetimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

type RecipientKind = 'AllStudents' | 'Groups' | 'SelectedStudents' | 'ExamCandidates' | 'Admins';

const DELIVERY_CHANNELS = [
  { value: 'both', label: 'In-App + Email', sendEmail: true, sendInApp: true },
  { value: 'inapp', label: 'In-App Only', sendEmail: false, sendInApp: true },
  { value: 'email', label: 'Email Only', sendEmail: true, sendInApp: false },
] as const;

export default function CreateNotification() {
  const { data: exams } = useExams();
  const { data: users } = useUsers();
  const { data: groups } = useGroups();
  const { data: templates, isLoading: isLoadingTemplates } = useNotificationTemplates(
    undefined,
    undefined,
    undefined,
    'Active',
  );

  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientKind, setRecipientKind] = useState<RecipientKind>('AllStudents');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [relatedExamId, setRelatedExamId] = useState('');
  const [channel, setChannel] = useState<(typeof DELIVERY_CHANNELS)[number]['value']>('both');
  const [includeExamLink, setIncludeExamLink] = useState(true);
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 60 * 60_000)));
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<CreateNotificationResponse | null>(null);

  const template = (templates ?? []).find((t) => t.id === templateId) ?? null;
  const selectedChannel = DELIVERY_CHANNELS.find((c) => c.value === channel) ?? DELIVERY_CHANNELS[0];
  const publishedExams = useMemo(() => (exams ?? []).filter((e) => e.status === 'Published'), [exams]);
  const selectedExam = useMemo(() => (exams ?? []).find((e) => e.id === relatedExamId) ?? null, [exams, relatedExamId]);
  const students = useMemo(() => (users ?? []).filter((u) => u.role === 'Student'), [users]);
  const admins = useMemo(() => (users ?? []).filter((u) => u.role === 'Admin'), [users]);
  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(studentSearch.trim().toLowerCase()),
  );

  const applyTemplate = (id: string) => {
    const next = (templates ?? []).find((t) => t.id === id);
    if (!next) return;
    setTemplateId(id);
    // Only overwrite fields the admin hasn't already hand-edited away from
    // the current template's own text, so switching templates doesn't
    // clobber something they just typed.
    if (!template || title === template.subject || title.trim() === '') setTitle(next.subject);
    if (!template || message === template.body || message.trim() === '') setMessage(next.body);
    // Templates keep email/in-app consistent by also presetting the
    // Delivery Channels dropdown from the template's own defaults.
    if (next.sendEmail && next.sendInApp) setChannel('both');
    else if (next.sendInApp) setChannel('inapp');
    else if (next.sendEmail) setChannel('email');
  };

  // Templates load asynchronously (real backend, not a static array) - pick
  // the first one as the default once they arrive, same as the old
  // hardcoded array's NOTIFICATION_TEMPLATES[0] default.
  useEffect(() => {
    if (!templateId && templates && templates.length > 0) {
      applyTemplate(templates[0].id);
    }
    // Deliberately only re-runs when the template list itself changes -
    // applyTemplate/templateId are intentionally excluded so picking a
    // template doesn't retrigger this "pick a default" effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  const toggleStudent = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const recipientCount: number | null = (() => {
    switch (recipientKind) {
      case 'AllStudents':
        return students.length;
      case 'Admins':
        return admins.length;
      case 'SelectedStudents':
        return selectedUserIds.size;
      case 'Groups':
        return (groups ?? [])
          .filter((g) => selectedGroupIds.has(g.id))
          .reduce((sum, g) => sum + g.memberCount, 0);
      case 'ExamCandidates':
        return null; // no cheap real client-side count - shown as text instead
      default:
        return 0;
    }
  })();

  const messageHasExamPlaceholder = containsExamFieldPlaceholder(title) || containsExamFieldPlaceholder(message);

  const canSubmit =
    !!template &&
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (recipientKind !== 'SelectedStudents' || selectedUserIds.size > 0) &&
    (recipientKind !== 'Groups' || selectedGroupIds.size > 0) &&
    (recipientKind !== 'ExamCandidates' || !!relatedExamId) &&
    (!messageHasExamPlaceholder || !!relatedExamId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error('Select a notification template first.');

      let sendTo: NotificationSendToType;
      let userIds: string[] | null = null;

      if (recipientKind === 'Groups') {
        const groupDetails = await Promise.all(Array.from(selectedGroupIds).map((id) => getGroup(id)));
        userIds = Array.from(new Set(groupDetails.flatMap((g) => g.memberUserIds)));
        sendTo = 'SelectedStudents';
      } else if (recipientKind === 'SelectedStudents') {
        userIds = Array.from(selectedUserIds);
        sendTo = 'SelectedStudents';
      } else {
        sendTo = recipientKind;
      }

      const finalTitle = substituteExamFields(title, selectedExam);
      let finalMessage = substituteExamFields(message, selectedExam);
      if (includeExamLink && selectedExam) {
        finalMessage += `\n\nView exam: ${window.location.origin}/exams/${selectedExam.id}`;
      }

      return createNotification({
        title: finalTitle,
        message: finalMessage,
        type: template.type,
        sendTo,
        userIds,
        relatedExamId: relatedExamId || null,
        sendNow,
        scheduledAtUtc: sendNow ? null : new Date(scheduledAt).toISOString(),
        sendEmail: selectedChannel.sendEmail,
        sendInApp: selectedChannel.sendInApp,
      });
    },
    onSuccess: (response) => {
      setSubmitError('');
      setCreated(response);
    },
    onError: (error) => setSubmitError(extractServerError(error)),
  });

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

  if (isLoadingTemplates) {
    return (
      <AdminLayout active="Create Notification">
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  const previewTitle = substituteExamFields(title, selectedExam) || 'Untitled notification';
  const previewMessage = (substituteExamFields(message, selectedExam) || 'No message yet.').replaceAll(
    '{{studentName}}',
    'Student',
  );

  return (
    <AdminLayout active="Create Notification">
      <h1 className="h4 fw-bold mb-1 text-primary">Send Notification</h1>
      <p className="text-muted mb-4">Compose and send targeted in-app and email notifications.</p>

      {submitError && (
        <Alert variant="danger" onClose={() => setSubmitError('')} dismissible>
          {submitError}
        </Alert>
      )}

      <Row className="g-3">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <SectionHeader icon={<ComposerIcon />} title="Notification Composer" />
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Notification Type *</Form.Label>
                      <Form.Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                        {(templates ?? []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Delivery Channels</Form.Label>
                      <Form.Select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
                        {DELIVERY_CHANNELS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Recipients *</Form.Label>
                      <Form.Select
                        value={recipientKind}
                        onChange={(e) => setRecipientKind(e.target.value as RecipientKind)}
                      >
                        <option value="AllStudents">All Students</option>
                        <option value="Groups">Groups / Batches</option>
                        <option value="SelectedStudents">Individual Students</option>
                        <option value="ExamCandidates">Exam Candidates</option>
                        <option value="Admins">Admins</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">&nbsp;</Form.Label>
                      <div className="form-control bg-light text-muted">
                        {recipientCount === null
                          ? 'Recipients determined at send time'
                          : `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} selected`}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {recipientKind === 'Groups' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted">Select Groups</Form.Label>
                    <ListGroup style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {(groups ?? []).length === 0 && (
                        <ListGroup.Item className="text-muted small">No groups yet.</ListGroup.Item>
                      )}
                      {(groups ?? []).map((group) => (
                        <ListGroup.Item key={group.id}>
                          <Form.Check
                            type="checkbox"
                            label={`${group.name} (${group.memberCount} members)`}
                            checked={selectedGroupIds.has(group.id)}
                            onChange={() => toggleGroup(group.id)}
                          />
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Form.Group>
                )}

                {recipientKind === 'SelectedStudents' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted">
                      Select Students ({selectedUserIds.size} selected)
                    </Form.Label>
                    <Form.Control
                      type="search"
                      className="mb-2"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                    <ListGroup style={{ maxHeight: 200, overflowY: 'auto' }}>
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

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    Related Exam {recipientKind !== 'ExamCandidates' && messageHasExamPlaceholder && '*'}
                    {recipientKind !== 'ExamCandidates' && !messageHasExamPlaceholder && ' (Optional)'}
                  </Form.Label>
                  <Form.Select value={relatedExamId} onChange={(e) => setRelatedExamId(e.target.value)}>
                    <option value="">Select Exam</option>
                    {publishedExams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))}
                  </Form.Select>
                  {messageHasExamPlaceholder && !relatedExamId && (
                    <div className="text-danger small mt-1">
                      Your message uses exam merge fields - select an exam so they can be filled in.
                    </div>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Title *</Form.Label>
                  <Form.Control
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Your .NET Full Stack Exam is Assigned"
                    maxLength={200}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Message *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={7}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    maxLength={2000}
                    required
                  />
                  <div className="text-muted small mt-1">
                    Merge fields: {'{{studentName}}'}, {'{{studentEmail}}'}, {'{{examTitle}}'}, {'{{startDate}}'},{' '}
                    {'{{duration}}'}
                  </div>
                </Form.Group>

                <div className="mt-4">
                  <SectionHeader icon={<OptionsIcon />} title="Options" />
                </div>
                <ListGroup variant="flush" className="mb-3">
                  <ListGroup.Item className="px-0 py-1 border-0 d-flex align-items-center gap-2">
                    <span className={selectedChannel.sendEmail ? 'text-success' : 'text-muted'}>
                      {selectedChannel.sendEmail ? '✓' : '–'}
                    </span>
                    Send email notification
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 py-1 border-0 d-flex align-items-center gap-2">
                    <span className={selectedChannel.sendInApp ? 'text-success' : 'text-muted'}>
                      {selectedChannel.sendInApp ? '✓' : '–'}
                    </span>
                    Send in-app notification
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 py-1 border-0">
                    <Form.Check
                      type="checkbox"
                      label="Include exam link"
                      checked={includeExamLink}
                      disabled={!selectedExam}
                      onChange={(e) => setIncludeExamLink(e.target.checked)}
                    />
                  </ListGroup.Item>
                  <ListGroup.Item className="px-0 py-1 border-0 d-flex align-items-center gap-2 text-muted">
                    <span className="text-success">✓</span>
                    Track delivery status
                  </ListGroup.Item>
                </ListGroup>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Send Now or Schedule</Form.Label>
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
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <SectionHeader icon={<SendIconHeader />} title="Delivery Summary" />

              <div className="text-muted small">Recipients</div>
              <div className="h5 fw-bold mb-3">
                {recipientCount === null ? 'Determined at send time' : recipientCount.toLocaleString()}
              </div>

              <div className="text-muted small">Channels</div>
              <div className="fw-bold text-primary mb-3">{selectedChannel.label}</div>

              <div className="text-muted small">Template</div>
              <div className="fw-bold mb-3">{template?.name ?? '—'}</div>

              <div className="text-muted small">Status</div>
              <div className="mb-3">
                <Badge bg={canSubmit ? 'success' : 'secondary'}>{canSubmit ? 'Ready to Send' : 'Incomplete'}</Badge>
              </div>

              <Card className="border-0" style={{ background: '#eef2ff' }}>
                <Card.Body className="p-3">
                  <div className="fw-bold text-primary mb-2">Preview</div>
                  <div className="fw-bold small">{previewTitle}</div>
                  <div className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
                    {previewMessage}
                  </div>
                </Card.Body>
              </Card>

              <div className="text-muted small mt-3">Tip: Use templates for recurring notifications.</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
