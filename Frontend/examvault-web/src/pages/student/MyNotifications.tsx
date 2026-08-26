import { useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Dropdown, Form, Pagination, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '../../layouts/StudentLayout';
import { CheckIcon } from '../../components/icons/ActionIcons';
import NotificationTypeIcon from '../../components/notifications/NotificationTypeIcon';
import NotificationPreferencesPreview from '../../components/notifications/NotificationPreferencesPreview';
import { useMyNotifications } from '../../hooks/useNotifications';
import { deleteMyNotification, markAllNotificationsAsRead, markNotificationAsRead } from '../../api/notificationApi';
import type { NotificationResponse, NotificationType } from '../../types/notification';

const PAGE_SIZE = 6;

export default function MyNotifications() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'All' | 'Unread'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | NotificationType>('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useMyNotifications(false, 1, 100);

  const items = data?.items ?? [];
  const unreadCount = items.filter((n) => !n.isRead).length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = items.filter((n) => new Date(n.createdAtUtc).getTime() >= weekAgo).length;

  const tabItems = tab === 'Unread' ? items.filter((n) => !n.isRead) : items;
  const filteredItems = typeFilter === 'All' ? tabItems : tabItems.filter((n) => n.type === typeFilter);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [tab, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  const allPageSelected = pageItems.length > 0 && pageItems.every((n) => selected.has(n.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageItems.forEach((n) => next.delete(n.id));
      } else {
        pageItems.forEach((n) => next.add(n.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidate,
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: invalidate,
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) => deleteMyNotification(id),
    onSuccess: invalidate,
  });

  const bulkMarkReadMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => markNotificationAsRead(id))),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => deleteMyNotification(id))),
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
    },
  });

  return (
    <StudentLayout active="Notifications">
      <h1 className="h4 fw-bold mb-1 text-primary">Notifications</h1>
      <p className="text-muted mb-4">Stay updated with your exam activities and important updates.</p>

      <Row className="g-3">
        <Col lg={8}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex gap-4 border-bottom flex-grow-1">
              {(['All', 'Unread'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="btn btn-link text-decoration-none px-0 pb-2 d-flex align-items-center gap-1"
                  style={{
                    borderBottom: t === tab ? '2px solid #4f46e5' : '2px solid transparent',
                    color: t === tab ? '#4f46e5' : '#6c757d',
                    fontWeight: t === tab ? 600 : 400,
                  }}
                  onClick={() => setTab(t)}
                >
                  {t}
                  <Badge bg={t === tab ? 'primary' : 'secondary'} pill>
                    {t === 'All' ? items.length : unreadCount}
                  </Badge>
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckIcon size={13} /> Mark all as read
              </Button>
            )}
          </div>

          <Card className="border-0 shadow-sm">
            <Card.Body className={isLoading || isError || pageItems.length === 0 ? '' : 'p-0'}>
              {isLoading && (
                <div className="d-flex justify-content-center py-5">
                  <Spinner animation="border" />
                </div>
              )}

              {isError && (
                <div className="text-center text-danger py-5">Couldn't load your notifications. Please try again.</div>
              )}

              {!isLoading && !isError && (
                <>
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <Form.Check
                      type="checkbox"
                      label="Select All"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      disabled={pageItems.length === 0}
                    />
                    <div className="d-flex align-items-center gap-2">
                      {selected.size > 0 && (
                        <>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => bulkMarkReadMutation.mutate(Array.from(selected))}
                            disabled={bulkMarkReadMutation.isPending}
                          >
                            Mark read
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
                            disabled={bulkDeleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                      <Form.Select
                        size="sm"
                        style={{ width: 160 }}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'All' | NotificationType)}
                      >
                        <option value="All">All Types</option>
                        <option value="Exam">Exam</option>
                        <option value="Reminder">Reminder</option>
                        <option value="Result">Result</option>
                        <option value="System">System</option>
                        <option value="Account">Account</option>
                      </Form.Select>
                    </div>
                  </div>

                  {pageItems.length === 0 && (
                    <div className="text-center text-muted py-5">
                      {tab === 'Unread' ? 'No unread notifications.' : 'No notifications yet.'}
                    </div>
                  )}

                  {pageItems.map((notification: NotificationResponse) => (
                    <div
                      key={notification.id}
                      className="d-flex align-items-start gap-3 px-3 py-3 border-bottom"
                    >
                      <Form.Check
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(notification.id)}
                        onChange={() => toggleOne(notification.id)}
                      />
                      <NotificationTypeIcon type={notification.type} />
                      <Link
                        to={`/notifications/${notification.id}`}
                        className="flex-grow-1 text-decoration-none text-body"
                        onClick={() => {
                          if (!notification.isRead) markOneReadMutation.mutate(notification.id);
                        }}
                      >
                        <div className={notification.isRead ? 'fw-medium' : 'fw-bold'}>{notification.title}</div>
                        <div className="text-muted small">{notification.message}</div>
                      </Link>
                      <div className="text-end text-muted small text-nowrap">
                        <div>{new Date(notification.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div>{new Date(notification.createdAtUtc).toLocaleDateString()}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {!notification.isRead && (
                          <span
                            className="rounded-circle bg-primary d-inline-block"
                            style={{ width: 8, height: 8 }}
                            title="Unread"
                          />
                        )}
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            variant="link"
                            className="text-muted p-0"
                            style={{ boxShadow: 'none' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="1.8" />
                              <circle cx="12" cy="12" r="1.8" />
                              <circle cx="12" cy="19" r="1.8" />
                            </svg>
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            {!notification.isRead && (
                              <Dropdown.Item onClick={() => markOneReadMutation.mutate(notification.id)}>
                                Mark as read
                              </Dropdown.Item>
                            )}
                            <Dropdown.Item
                              className="text-danger"
                              onClick={() => deleteOneMutation.mutate(notification.id)}
                            >
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Card.Body>
          </Card>

          {!isLoading && !isError && filteredItems.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {rangeStart} to {rangeEnd} of {filteredItems.length} notifications
              </div>
              <Pagination className="mb-0">
                <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                    {p}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </Pagination>
            </div>
          )}
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h2 className="h6 fw-bold mb-3">Notification Summary</h2>
              <div className="d-flex justify-content-between small mb-2">
                <span>Total Notifications</span>
                <span className="fw-medium">{items.length}</span>
              </div>
              <div className="d-flex justify-content-between small mb-2">
                <span>Unread</span>
                <span className="fw-medium text-danger">{unreadCount}</span>
              </div>
              <div className="d-flex justify-content-between small">
                <span>This Week</span>
                <span className="fw-medium">{thisWeekCount}</span>
              </div>
            </Card.Body>
          </Card>

          <NotificationPreferencesPreview />
        </Col>
      </Row>
    </StudentLayout>
  );
}
