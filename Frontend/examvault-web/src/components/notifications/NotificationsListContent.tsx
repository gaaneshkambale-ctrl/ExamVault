import { useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useMyNotifications } from '../../hooks/useNotifications';
import { markAllNotificationsAsRead } from '../../api/notificationApi';
import NotificationTypeBadge from './NotificationTypeBadge';

export default function NotificationsListContent() {
  const { user } = useAuth();
  const basePath = user?.role === 'Admin' ? '/admin/notifications' : '/notifications';
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, isError } = useMyNotifications(unreadOnly, 1, 50);
  const queryClient = useQueryClient();

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = data?.items ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 text-primary">Notifications</h1>
          <p className="text-muted mb-0">Everything addressed to you, newest first.</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </Button>
        )}
      </div>

      <Row className="g-2 mb-3">
        <Col md={4}>
          <Form.Select value={unreadOnly ? 'Unread' : 'All'} onChange={(e) => setUnreadOnly(e.target.value === 'Unread')}>
            <option value="All">All Notifications</option>
            <option value="Unread">Unread Only</option>
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
            <div className="text-center text-danger py-5">Couldn't load your notifications. Please try again.</div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center text-muted py-5">
              {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
            </div>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Type</th>
                  <th>Title</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th className="pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((notification) => (
                  <tr key={notification.id} className={notification.isRead ? '' : 'fw-semibold'}>
                    <td className="ps-4">
                      <NotificationTypeBadge type={notification.type} />
                    </td>
                    <td>{notification.title}</td>
                    <td>{new Date(notification.createdAtUtc).toLocaleString()}</td>
                    <td>
                      <span className={notification.isRead ? 'text-muted small' : 'text-primary small'}>
                        {notification.isRead ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="pe-4">
                      <Link to={`${basePath}/${notification.id}`} className="btn btn-outline-secondary btn-sm">
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
    </>
  );
}
