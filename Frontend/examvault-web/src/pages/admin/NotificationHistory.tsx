import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { useNotificationHistory } from '../../hooks/useNotifications';
import NotificationTypeBadge from '../../components/notifications/NotificationTypeBadge';
import { NOTIFICATION_TYPES } from '../../types/notification';
import type { NotificationType } from '../../types/notification';

const PAGE_SIZE = 10;

export default function NotificationHistory() {
  const [type, setType] = useState<NotificationType | 'All'>('All');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useNotificationHistory(type === 'All' ? undefined : type, page, PAGE_SIZE);
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <AdminLayout active="History">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Notification History</h1>
          <p className="text-muted mb-0">Every notification sent, system-triggered or admin-authored.</p>
        </div>
        <Link to="/admin/notifications/create" className="btn btn-primary">
          + Create Notification
        </Link>
      </div>

      <Row className="g-2 mb-3">
        <Col md={3}>
          <Form.Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as NotificationType | 'All');
              setPage(1);
            }}
          >
            <option value="All">All Types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || items.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load notification history. Please try again.</div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">No notifications sent yet.</div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Title</th>
                  <th>Type</th>
                  <th>Recipients</th>
                  <th>Sent Date</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((batch) => (
                  <tr key={batch.batchId}>
                    <td className="ps-4 fw-medium">{batch.title}</td>
                    <td>
                      <NotificationTypeBadge type={batch.type} />
                    </td>
                    <td>{batch.recipientCount}</td>
                    <td>{new Date(batch.sentAtUtc).toLocaleString()}</td>
                    <td>
                      <Badge bg={batch.status === 'Sent' ? 'success' : 'info'}>{batch.status}</Badge>
                    </td>
                    <td className="pe-4">
                      <Link
                        to={`/admin/notifications/history/${batch.batchId}`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Showing page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
