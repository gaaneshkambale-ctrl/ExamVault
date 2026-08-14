import { useState } from 'react';
import { Badge, Card, Col, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteUserButton from '../../components/DeleteUserButton';
import ToggleUserActiveButton from '../../components/ToggleUserActiveButton';
import { useExams } from '../../hooks/useExams';
import { useUserAttempts } from '../../hooks/useSubmissions';
import { useUser, useUserSessions } from '../../hooks/useUsers';
import type { UserListItem, UserRole, UserSession, UserSessionStatus } from '../../types/user';
import type { ExamAttemptResponse } from '../../types/submission';

const roleVariant: Record<UserRole, string> = {
  Admin: 'primary',
  Student: 'secondary',
};

const sessionStatusVariant: Record<UserSessionStatus, string> = {
  Active: 'success',
  Expired: 'secondary',
  Revoked: 'danger',
};

const tabs = ['Profile', 'Activity', 'Exam History', 'Logs'] as const;
type Tab = (typeof tabs)[number];

interface ActivityEntry {
  id: string;
  timestampUtc: string;
  badge: string;
  badgeVariant: string;
  activity: string;
  details: string;
}

function buildActivityFeed(
  user: UserListItem,
  sessions: UserSession[] | undefined,
  attempts: ExamAttemptResponse[] | undefined,
  examTitleById: Map<string, string>,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    {
      id: 'account-created',
      timestampUtc: user.createdAtUtc,
      badge: 'Account',
      badgeVariant: 'primary',
      activity: 'Account Created',
      details: `Account created for ${user.email}`,
    },
  ];

  for (const session of sessions ?? []) {
    entries.push({
      id: `login-${session.id}`,
      timestampUtc: session.issuedAtUtc,
      badge: 'Login',
      badgeVariant: 'info',
      activity: 'Logged In',
      details: `Session valid until ${new Date(session.expiresAtUtc).toLocaleString()}`,
    });
  }

  for (const attempt of attempts ?? []) {
    const examTitle = examTitleById.get(attempt.examId) ?? 'an exam';
    entries.push({
      id: `attempt-started-${attempt.id}`,
      timestampUtc: attempt.startedAtUtc,
      badge: 'Exam',
      badgeVariant: 'secondary',
      activity: 'Exam Started',
      details: `"${examTitle}" — attempt ${attempt.attemptNumber}`,
    });
    if (attempt.submittedAtUtc) {
      const isAutoSubmitted = attempt.status === 'AutoSubmitted';
      entries.push({
        id: `attempt-submitted-${attempt.id}`,
        timestampUtc: attempt.submittedAtUtc,
        badge: isAutoSubmitted ? 'Auto-Submit' : 'Exam',
        badgeVariant: 'success',
        activity: isAutoSubmitted ? 'Exam Auto-Submitted' : 'Exam Submitted',
        details: isAutoSubmitted ? `"${examTitle}" — time expired` : `"${examTitle}"`,
      });
    }
  }

  return entries.sort(
    (a, b) => new Date(b.timestampUtc).getTime() - new Date(a.timestampUtc).getTime(),
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Col xs={12} sm={6} className="mb-3">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-medium">{value}</div>
    </Col>
  );
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useUser(id);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
  } = useUserSessions(id, activeTab === 'Logs' || activeTab === 'Activity');
  const {
    data: attempts,
    isLoading: attemptsLoading,
    isError: attemptsError,
  } = useUserAttempts(id, activeTab === 'Activity');
  const { data: exams } = useExams(activeTab === 'Activity');
  const examTitleById = new Map((exams ?? []).map((exam) => [exam.id, exam.title]));
  const activityFeed = user
    ? buildActivityFeed(user, sessions, attempts, examTitleById)
    : [];
  const activityLoading = sessionsLoading || attemptsLoading;
  const activityError = sessionsError || attemptsError;

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">User Details</h1>
          <p className="text-muted mb-0">View complete information about the user.</p>
        </div>
        <div className="d-flex gap-2">
          {id && user && (
            <>
              <ToggleUserActiveButton userId={id} isActive={user.isActive} />
              <DeleteUserButton userId={id} onDeleted={() => navigate('/admin/users')} />
              <Link to={`/admin/users/${id}/reset-password`} className="btn btn-outline-secondary">
                Reset Password
              </Link>
              <Link to={`/admin/users/${id}/edit`} className="btn btn-primary">
                Edit User
              </Link>
            </>
          )}
          <Link to="/admin/users" className="btn btn-outline-secondary">
            Back to Users
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">
              Couldn't load this user. They may not exist.
            </div>
          )}

          {user && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h2 className="h5 fw-bold mb-1">{user.fullName}</h2>
                  <p className="text-muted mb-0">{user.email}</p>
                </div>
                <div className="d-flex flex-column gap-2 align-items-end">
                  <Badge bg={roleVariant[user.role]}>{user.role}</Badge>
                  <Badge bg={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <Nav variant="tabs" className="mb-4">
                {tabs.map((tab) => (
                  <Nav.Item key={tab}>
                    <Nav.Link active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                      {tab}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>

              {activeTab === 'Profile' && (
                <Row>
                  <Field label="Full Name" value={user.fullName} />
                  <Field label="Email" value={user.email} />
                  <Field label="Phone Number" value={user.phoneNumber ?? '—'} />
                  <Field label="Role" value={user.role} />
                  <Field label="Joined On" value={new Date(user.createdAtUtc).toLocaleString()} />
                </Row>
              )}

              {activeTab === 'Logs' && (
                <>
                  {sessionsLoading && (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" />
                    </div>
                  )}

                  {sessionsError && (
                    <div className="text-center text-danger py-5">
                      Couldn't load login/session history for this user.
                    </div>
                  )}

                  {sessions && sessions.length === 0 && (
                    <div className="text-center text-muted py-5">
                      No login sessions recorded for this user yet.
                    </div>
                  )}

                  {sessions && sessions.length > 0 && (
                    <Table responsive hover className="align-middle">
                      <thead>
                        <tr>
                          <th>Issued On</th>
                          <th>Expires On</th>
                          <th>Revoked On</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr key={session.id}>
                            <td>{new Date(session.issuedAtUtc).toLocaleString()}</td>
                            <td>{new Date(session.expiresAtUtc).toLocaleString()}</td>
                            <td>{session.revokedAtUtc ? new Date(session.revokedAtUtc).toLocaleString() : '—'}</td>
                            <td>
                              <Badge bg={sessionStatusVariant[session.status]}>{session.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}

              {activeTab === 'Activity' && (
                <>
                  {activityLoading && (
                    <div className="d-flex justify-content-center py-5">
                      <Spinner animation="border" />
                    </div>
                  )}

                  {!activityLoading && activityError && (
                    <div className="text-center text-danger py-5">
                      Couldn't load activity for this user.
                    </div>
                  )}

                  {!activityLoading && !activityError && activityFeed.length === 0 && (
                    <div className="text-center text-muted py-5">No activity recorded for this user yet.</div>
                  )}

                  {!activityLoading && !activityError && activityFeed.length > 0 && (
                    <Table responsive hover className="align-middle">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Activity</th>
                          <th>Details</th>
                          <th>Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityFeed.map((entry) => (
                          <tr key={entry.id}>
                            <td>
                              <Badge bg={entry.badgeVariant}>{entry.badge}</Badge>
                            </td>
                            <td>{entry.activity}</td>
                            <td className="text-muted">{entry.details}</td>
                            <td>{new Date(entry.timestampUtc).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}

              {activeTab === 'Exam History' && (
                <div className="text-center text-muted py-5">
                  Exam History isn't tracked yet — there's no data source for it in ExamVault today.
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
