import { useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import UserAvatar from '../../components/UserAvatar';
import DeleteUserButton from '../../components/DeleteUserButton';
import ToggleUserActiveButton from '../../components/ToggleUserActiveButton';
import { useExams } from '../../hooks/useExams';
import { useUserAttempts } from '../../hooks/useSubmissions';
import { useUser, useUserSessions } from '../../hooks/useUsers';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { ADMIN_PERMISSIONS, STUDENT_PERMISSIONS } from '../../constants/cosmeticRolePermissions';
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

const tabs = ['Profile Information', 'Assigned Roles', 'Activity Log', 'Login History'] as const;
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
    <div className="d-flex justify-content-between border-bottom py-2">
      <span className="text-muted small">{label}</span>
      <span className="fw-medium small text-end">{value}</span>
    </div>
  );
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useUser(id);
  const { data: liveRolePermissions } = useRolePermissions();
  const [activeTab, setActiveTab] = useState<Tab>('Profile Information');
  const { data: sessions, isLoading: sessionsLoading, isError: sessionsError } = useUserSessions(id);
  const {
    data: attempts,
    isLoading: attemptsLoading,
    isError: attemptsError,
  } = useUserAttempts(id, activeTab === 'Activity Log');
  const { data: exams } = useExams(activeTab === 'Activity Log');
  const examTitleById = new Map((exams ?? []).map((exam) => [exam.id, exam.title]));
  const activityFeed = user
    ? buildActivityFeed(user, sessions, attempts, examTitleById)
    : [];
  const activityLoading = sessionsLoading || attemptsLoading;
  const activityError = sessionsError || attemptsError;

  const lastLogin = [...(sessions ?? [])].sort(
    (a, b) => new Date(b.issuedAtUtc).getTime() - new Date(a.issuedAtUtc).getTime(),
  )[0];

  const defaultPermissions = user?.role === 'Admin' ? ADMIN_PERMISSIONS : STUDENT_PERMISSIONS;
  const permissions =
    liveRolePermissions?.find((r) => r.role === user?.role)?.permissions ?? defaultPermissions;

  return (
    <AdminLayout active="Users">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <p className="text-muted small mb-0">Users / User Profile</p>
        <Link to="/admin/users" className="btn btn-outline-secondary btn-sm">
          &larr; Back to Users
        </Link>
      </div>
      <h1 className="h4 fw-bold mb-4 text-primary">User Profile</h1>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <div className="text-center text-danger py-5">Couldn't load this user. They may not exist.</div>
      )}

      {user && id && (
        <Row className="g-4">
          <Col xs={12} lg={4} xl={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4 text-center">
                <UserAvatar fullName={user.fullName} hasPhoto={user.hasPhoto} userId={id} size={96} />
                <div className="h5 fw-bold mt-3 mb-0">{user.fullName}</div>
                <div className="text-muted small mb-2">{user.email}</div>
                <Badge bg={roleVariant[user.role]}>{user.role}</Badge>{' '}
                <Badge bg={user.isActive ? 'success' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>

                <div className="text-start mt-4">
                  <Field label="User ID" value={user.id} />
                  <Field label="Phone" value={user.phoneNumber ?? '—'} />
                  <Field label="Department" value="—" />
                  <Field label="Joined On" value={new Date(user.createdAtUtc).toLocaleDateString()} />
                  <Field label="Last Login" value={lastLogin ? new Date(lastLogin.issuedAtUtc).toLocaleString() : 'Never'} />
                </div>

                <div className="d-flex flex-column gap-2 mt-4">
                  <ToggleUserActiveButton userId={id} isActive={user.isActive} />
                  <Link to={`/admin/users/${id}/reset-password`} className="btn btn-outline-secondary btn-sm">
                    Reset Password
                  </Link>
                  <Link to={`/admin/users/${id}/edit`} className="btn btn-primary btn-sm">
                    Edit Profile
                  </Link>
                  <DeleteUserButton userId={id} onDeleted={() => navigate('/admin/users')} />
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={8} xl={9}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="d-flex gap-4 border-bottom mb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className="btn btn-link text-decoration-none px-0 pb-2"
                      style={{
                        borderBottom: tab === activeTab ? '2px solid #4f46e5' : '2px solid transparent',
                        color: tab === activeTab ? '#4f46e5' : '#6c757d',
                        fontWeight: tab === activeTab ? 600 : 400,
                      }}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Profile Information' && (
                  <Row>
                    <Col xs={12} sm={6} className="mb-3">
                      <div className="text-muted small mb-1">Full Name</div>
                      <div className="fw-medium">{user.fullName}</div>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <div className="text-muted small mb-1">Email</div>
                      <div className="fw-medium">{user.email}</div>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <div className="text-muted small mb-1">Phone Number</div>
                      <div className="fw-medium">{user.phoneNumber ?? '—'}</div>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <div className="text-muted small mb-1">Role</div>
                      <div className="fw-medium">{user.role}</div>
                    </Col>
                    <Col xs={12} sm={6} className="mb-3">
                      <div className="text-muted small mb-1">Joined On</div>
                      <div className="fw-medium">{new Date(user.createdAtUtc).toLocaleString()}</div>
                    </Col>
                  </Row>
                )}

                {activeTab === 'Assigned Roles' && (
                  <>
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Badge bg={roleVariant[user.role]}>{user.role}</Badge>
                      <span className="text-muted small">is this user's only assigned role.</span>
                    </div>
                    <p className="text-muted small">
                      Permissions below reflect {user.role}'s current permission set, editable from Roles &amp;
                      Permissions - ExamVault doesn't have a granular, per-permission enforcement system yet,
                      only the Admin/Student role check.
                    </p>
                    <Row>
                      {permissions.map((perm) => (
                        <Col xs={6} md={4} key={perm} className="mb-2 small">
                          ✓ {perm}
                        </Col>
                      ))}
                    </Row>
                  </>
                )}

                {activeTab === 'Login History' && (
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

                {activeTab === 'Activity Log' && (
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
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </AdminLayout>
  );
}
