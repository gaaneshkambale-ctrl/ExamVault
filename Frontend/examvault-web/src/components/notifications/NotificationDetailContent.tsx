import { useState } from 'react';
import { Badge, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useExam } from '../../hooks/useExams';
import { useNotification } from '../../hooks/useNotifications';
import { deleteMyNotification, markNotificationAsRead } from '../../api/notificationApi';
import NotificationTypeBadge from './NotificationTypeBadge';

const emailStatusVariant: Record<string, string> = {
  Delivered: 'success',
  Failed: 'danger',
  Pending: 'secondary',
};

export default function NotificationDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = user?.role === 'Admin';
  const basePath = isAdmin ? '/admin/notifications' : '/notifications';
  const examLinkPath = isAdmin ? '/admin/exams' : '/exams';

  const { data: notification, isLoading, isError } = useNotification(id);
  const { data: exam } = useExam(notification?.relatedExamId ?? undefined);

  const markReadMutation = useMutation({
    mutationFn: () => markNotificationAsRead(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMyNotification(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      navigate(basePath);
    },
  });

  return (
    <>
      <Link to={basePath} className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Notifications
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center text-danger py-5">Couldn't load this notification. Please try again.</div>
      )}

      {!isLoading && !isError && notification && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <NotificationTypeBadge type={notification.type} />
                  {!notification.isRead && <Badge bg="primary">Unread</Badge>}
                </div>
                <h1 className="h5 fw-bold mb-0">{notification.title}</h1>
              </div>
            </div>

            <p className="mb-4">{notification.message}</p>

            <dl className="row small text-muted mb-4">
              <dt className="col-sm-3">Type</dt>
              <dd className="col-sm-9">{notification.type}</dd>

              {exam && (
                <>
                  <dt className="col-sm-3">Related Exam</dt>
                  <dd className="col-sm-9">{exam.title}</dd>
                </>
              )}

              <dt className="col-sm-3">Received On</dt>
              <dd className="col-sm-9">{new Date(notification.createdAtUtc).toLocaleString()}</dd>

              <dt className="col-sm-3">Email Status</dt>
              <dd className="col-sm-9">
                <Badge bg={emailStatusVariant[notification.emailStatus]}>{notification.emailStatus}</Badge>
              </dd>
            </dl>

            <div className="d-flex gap-2">
              {exam && notification.relatedExamId && (
                <Link to={`${examLinkPath}/${notification.relatedExamId}`} className="btn btn-primary">
                  {isAdmin ? 'View Exam' : 'Take Exam'}
                </Link>
              )}
              {!notification.isRead && (
                <Button
                  variant="outline-primary"
                  onClick={() => markReadMutation.mutate()}
                  disabled={markReadMutation.isPending}
                >
                  {markReadMutation.isPending ? 'Marking...' : 'Mark as Read'}
                </Button>
              )}
              <Button variant="outline-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this notification? This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
