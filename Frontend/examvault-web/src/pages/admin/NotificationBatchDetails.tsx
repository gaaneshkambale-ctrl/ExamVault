import { useState } from 'react';
import { Badge, Button, Card, Col, Modal, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { useNotificationBatchDetails } from '../../hooks/useNotifications';
import { deleteNotificationBatch, resendNotificationBatch } from '../../api/notificationApi';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';

export default function NotificationBatchDetails() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: details, isLoading, isError } = useNotificationBatchDetails(batchId);

  const resendMutation = useMutation({
    mutationFn: () => resendNotificationBatch(batchId!),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'admin', 'history'] });
      navigate(`/admin/notifications/history/${response.newBatchId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteNotificationBatch(batchId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'admin', 'history'] });
      navigate('/admin/notifications/history');
    },
  });

  return (
    <AdminLayout active="History">
      <Link to="/admin/notifications/history" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to History
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center text-danger py-5">Couldn't load this notification. Please try again.</div>
      )}

      {!isLoading && details && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <NotificationTypeBadge type={details.type} />
                    <Badge bg={details.status === 'Sent' ? 'success' : 'info'}>{details.status}</Badge>
                  </div>
                  <h1 className="h5 fw-bold mb-0">{details.title}</h1>
                </div>
              </div>
              <p className="mb-3">{details.message}</p>
              <dl className="row small text-muted mb-0">
                <dt className="col-sm-3">Sent Date</dt>
                <dd className="col-sm-9">{new Date(details.sentAtUtc).toLocaleString()}</dd>
                {details.scheduledAtUtc && (
                  <>
                    <dt className="col-sm-3">Scheduled For</dt>
                    <dd className="col-sm-9">{new Date(details.scheduledAtUtc).toLocaleString()}</dd>
                  </>
                )}
              </dl>
            </Card.Body>
          </Card>

          <h2 className="h6 fw-bold mb-3">Recipients Summary</h2>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Recipients</div>
                  <div className="h4 fw-bold mb-0">{details.totalRecipients}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Delivered</div>
                  <div className="h4 fw-bold mb-0 text-success">
                    {details.delivered}
                    <span className="fs-6 text-muted">
                      {' '}
                      (
                      {details.totalRecipients > 0
                        ? Math.round((details.delivered / details.totalRecipients) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Failed</div>
                  <div className="h4 fw-bold mb-0 text-danger">
                    {details.failed}
                    <span className="fs-6 text-muted">
                      {' '}
                      (
                      {details.totalRecipients > 0
                        ? Math.round((details.failed / details.totalRecipients) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Pending</div>
                  <div className="h4 fw-bold mb-0 text-secondary">
                    {details.pending}
                    <span className="fs-6 text-muted">
                      {' '}
                      (
                      {details.totalRecipients > 0
                        ? Math.round((details.pending / details.totalRecipients) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button variant="primary" disabled={resendMutation.isPending} onClick={() => resendMutation.mutate()}>
              {resendMutation.isPending ? 'Resending...' : 'Resend Notification'}
            </Button>
            <Button variant="outline-danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Notification
            </Button>
          </div>
        </>
      )}

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this notification? It will be removed from every recipient's inbox.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
