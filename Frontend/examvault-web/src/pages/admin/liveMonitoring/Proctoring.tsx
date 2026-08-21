import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../../layouts/AdminLayout';
import UserAvatar from '../../../components/UserAvatar';
import { useExams } from '../../../hooks/useExams';
import { useUsers } from '../../../hooks/useUsers';
import { useAssignmentsByExam } from '../../../hooks/useAssignments';
import { useAttemptsByExam, useViolationsByExam } from '../../../hooks/useSubmissions';
import { forceSubmitAttempt } from '../../../api/submissionApi';
import type { ExamAttemptResponse } from '../../../types/submission';

// "Live monitoring" - same polling mechanism the other Live Monitoring pages use.
const POLL_INTERVAL_MS = 15000;

// No live video feed here - see the "why" note in the page component below.
// This just tracks whether the most recent unresolved signal for a session
// is a face-detection problem, derived from real ViolationEvent rows
// (Security Violations' same data), or the exam has no proctoring assignment
// at all for the student, in which case there's nothing to monitor.
type CardAlert = 'Active' | 'MultipleFaces' | 'NoFace' | 'ProctoringOff';

const alertMeta: Record<CardAlert, { label: string; bg: string; borderColor: string }> = {
  Active: { label: 'ACTIVE', bg: 'success', borderColor: '#198754' },
  MultipleFaces: { label: 'MULTIPLE FACES', bg: 'danger', borderColor: '#dc3545' },
  NoFace: { label: 'NO FACE DETECTED', bg: 'danger', borderColor: '#dc3545' },
  ProctoringOff: { label: 'PROCTORING OFF', bg: 'secondary', borderColor: '#adb5bd' },
};

interface SessionCard {
  attempt: ExamAttemptResponse;
  examId: string;
  examTitle: string;
  alert: CardAlert;
}

export default function Proctoring() {
  const queryClient = useQueryClient();
  const { data: exams, isLoading: isLoadingExams, isError: isExamsError } = useExams();
  const { data: users } = useUsers();
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [confirmCard, setConfirmCard] = useState<SessionCard | null>(null);
  const [confirmEndAll, setConfirmEndAll] = useState(false);

  const publishedExamIds = useMemo(
    () => (exams ?? []).filter((exam) => exam.status === 'Published').map((exam) => exam.id),
    [exams],
  );
  const { attemptsByExam, isLoading: isLoadingAttempts } = useAttemptsByExam(publishedExamIds, POLL_INTERVAL_MS);
  const { violationsByExam } = useViolationsByExam(publishedExamIds, POLL_INTERVAL_MS);
  const { assignmentsByExam } = useAssignmentsByExam(publishedExamIds);

  const examById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exam of exams ?? []) {
      map.set(exam.id, exam.title);
    }
    return map;
  }, [exams]);

  const userById = useMemo(() => {
    const map = new Map<string, { fullName: string; email: string; hasPhoto: boolean }>();
    for (const user of users ?? []) {
      map.set(user.id, { fullName: user.fullName, email: user.email, hasPhoto: user.hasPhoto });
    }
    return map;
  }, [users]);

  const proctoringEnabledByExam = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const examId of publishedExamIds) {
      map.set(examId, (assignmentsByExam[examId] ?? []).some((a) => a.enableProctoring));
    }
    return map;
  }, [publishedExamIds, assignmentsByExam]);

  const allCards: SessionCard[] = publishedExamIds.flatMap((examId) => {
    const inProgress = (attemptsByExam[examId] ?? []).filter((a) => a.status === 'InProgress');
    const violations = violationsByExam[examId] ?? [];
    const proctoringEnabled = proctoringEnabledByExam.get(examId) ?? false;
    const examTitle = examById.get(examId) ?? '';

    return inProgress.map((attempt) => {
      let alert: CardAlert = proctoringEnabled ? 'Active' : 'ProctoringOff';
      if (proctoringEnabled) {
        const openFaceAlert = violations
          .filter(
            (v) =>
              v.attemptId === attempt.id &&
              v.status !== 'Resolved' &&
              (v.type === 'MultipleFacesDetected' || v.type === 'NoFaceDetected'),
          )
          .sort((a, b) => new Date(b.detectedAtUtc).getTime() - new Date(a.detectedAtUtc).getTime())[0];
        if (openFaceAlert) {
          alert = openFaceAlert.type === 'MultipleFacesDetected' ? 'MultipleFaces' : 'NoFace';
        }
      }
      return { attempt, examId, examTitle, alert };
    });
  });

  const cards = allCards.filter((card) => {
    if (examFilter !== 'All' && card.examId !== examFilter) {
      return false;
    }
    const term = searchText.trim().toLowerCase();
    if (!term) {
      return true;
    }
    const user = userById.get(card.attempt.userId);
    const haystack = `${user?.fullName ?? ''} ${user?.email ?? ''}`.toLowerCase();
    return haystack.includes(term);
  });

  const anomalyCount = allCards.filter((c) => c.alert === 'MultipleFaces' || c.alert === 'NoFace').length;

  const endSessionMutation = useMutation({
    mutationFn: (attemptId: string) => forceSubmitAttempt(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setConfirmCard(null);
    },
  });

  const endAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.allSettled(cards.map((c) => forceSubmitAttempt(c.attempt.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setConfirmEndAll(false);
    },
  });

  const loading = isLoadingExams || isLoadingAttempts;

  return (
    <AdminLayout active="Proctoring">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Proctoring</h1>
          <p className="text-muted mb-0">
            Monitoring {allCards.length} student{allCards.length === 1 ? '' : 's'} concurrently. System anomalies:{' '}
            {anomalyCount}
          </p>
        </div>
        <Button variant="danger" disabled={cards.length === 0} onClick={() => setConfirmEndAll(true)}>
          End All Sessions
        </Button>
      </div>

      <div className="alert alert-light border small text-muted mb-4">
        Live camera feeds aren't available here - proctoring analysis (face detection, tab/window activity) runs
        privately in each student's own browser and only violation events are ever sent to the server. Cards below
        reflect that real signal, not a video call.
      </div>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search students..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {publishedExamIds.map((examId) => (
              <option key={examId} value={examId}>
                {examById.get(examId) ?? examId}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isExamsError && !loading && (
        <div className="text-center text-danger py-5">Couldn't load exams. Please try again.</div>
      )}

      {!loading && !isExamsError && allCards.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No students are currently taking an exam.</Card.Body>
        </Card>
      )}

      {!loading && !isExamsError && allCards.length > 0 && cards.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">No sessions match your search.</Card.Body>
        </Card>
      )}

      {!loading && !isExamsError && cards.length > 0 && (
        <Row className="g-3">
          {cards.map((card) => {
            const meta = alertMeta[card.alert];
            const user = userById.get(card.attempt.userId);
            return (
              <Col md={4} key={card.attempt.id}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderTop: `4px solid ${meta.borderColor}` }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center bg-light"
                    style={{ height: 140 }}
                  >
                    <UserAvatar
                      userId={card.attempt.userId}
                      fullName={user?.fullName ?? 'Student'}
                      hasPhoto={user?.hasPhoto ?? false}
                      size={72}
                    />
                  </div>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={meta.bg}>{meta.label}</Badge>
                    </div>
                    <div className="fw-medium">{user?.fullName ?? 'Unknown Student'}</div>
                    <div className="text-muted small mb-3">{user?.email ?? ''}</div>
                    <div className="text-muted small mb-3">{card.examTitle}</div>

                    <div className="d-flex justify-content-between align-items-center">
                      <Link to={`/admin/exams/${card.examId}`} className="small text-decoration-none">
                        View Exam →
                      </Link>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => setConfirmCard(card)}
                      >
                        End
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={confirmCard !== null} onHide={() => setConfirmCard(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>End Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to end {userById.get(confirmCard?.attempt.userId ?? '')?.fullName ?? 'this student'}
          's attempt on {confirmCard?.examTitle}? Their exam will be submitted immediately with whatever answers
          they've saved so far. This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setConfirmCard(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={endSessionMutation.isPending}
            onClick={() => confirmCard && endSessionMutation.mutate(confirmCard.attempt.id)}
          >
            {endSessionMutation.isPending ? 'Ending...' : 'End Session'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={confirmEndAll} onHide={() => setConfirmEndAll(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>End All Sessions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to end all {cards.length} visible session{cards.length === 1 ? '' : 's'}? Every
          matching student's exam will be submitted immediately with whatever answers they've saved so far. This
          cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setConfirmEndAll(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={endAllMutation.isPending} onClick={() => endAllMutation.mutate()}>
            {endAllMutation.isPending ? 'Ending...' : 'End All Sessions'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
