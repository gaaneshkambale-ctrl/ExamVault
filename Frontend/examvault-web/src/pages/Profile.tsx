import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
import ProfileAvatarIllustration from '../components/illustrations/ProfileAvatarIllustration';
import PersonalInfoPanel from '../components/profile/PersonalInfoPanel';
import AccountPreferencesPanel from '../components/profile/AccountPreferencesPanel';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';
import SessionsPanel from '../components/profile/SessionsPanel';
import ActivityLogPanel from '../components/profile/ActivityLogPanel';
import QuickActionsCard from '../components/profile/QuickActionsCard';
import NotificationPreferencesPanel from '../components/NotificationPreferencesPanel';
import { fetchMyPhotoObjectUrl, updateMyPhoto } from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import { extractServerError } from '../utils/apiError';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

function ProfilePhoto() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;
    if (user?.hasPhoto) {
      fetchMyPhotoObjectUrl().then((url) => {
        objectUrl = url;
        setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user?.hasPhoto]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Photo must be a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError('Photo must be 2 MB or smaller.');
      return;
    }

    setError('');
    setIsUploading(true);
    try {
      await updateMyPhoto(file);
      await refreshUser();
    } catch (uploadError) {
      setError(extractServerError(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center text-center">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Profile"
          className="rounded-circle"
          style={{ width: 96, height: 96, objectFit: 'cover' }}
        />
      ) : (
        <ProfileAvatarIllustration />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_PHOTO_TYPES.join(',')}
        className="d-none"
        onChange={handleFileChange}
      />
      <Button
        variant="outline-primary"
        size="sm"
        className="mt-3"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Uploading...
          </>
        ) : (
          'Change Photo'
        )}
      </Button>
      {error && (
        <Alert variant="danger" className="mt-2 mb-0 py-1 px-2 small">
          {error}
        </Alert>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const Layout = user.role === 'Admin' ? AdminLayout : StudentLayout;
  const dashboardPath = user.role === 'Admin' ? '/admin/dashboard' : '/dashboard';

  return (
    <Layout active="Profile">
      <Link to={dashboardPath} className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Dashboard
      </Link>

      <h1 className="h4 fw-bold mb-1">My Profile</h1>
      <p className="text-muted mb-4">View and manage your personal information and account settings.</p>

      <Row className="g-4">
        <Col xs={12} lg={4} xl={3}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <ProfilePhoto />
              <div className="text-center mt-3">
                <div className="h5 fw-bold mb-1">{user.fullName}</div>
                <Badge bg={user.role === 'Admin' ? 'primary' : 'info'}>{user.role}</Badge>
              </div>

              <hr className="my-3" />

              <div className="small mb-2">
                <span className="text-muted">Email:</span> {user.email}
              </div>
              {user.phoneNumber && (
                <div className="small mb-2">
                  <span className="text-muted">Phone:</span> {user.phoneNumber}
                </div>
              )}
              <div className="small text-muted">
                Last login: {user.lastLoginAtUtc ? new Date(user.lastLoginAtUtc).toLocaleString() : 'This session'}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="h6 fw-bold mb-3">Account Information</h2>
              <dl className="row small mb-0">
                <dt className="col-6 text-muted fw-normal">User ID</dt>
                <dd className="col-6 text-end">{user.formattedUserId ?? '—'}</dd>
                <dt className="col-6 text-muted fw-normal">Role</dt>
                <dd className="col-6 text-end">{user.role}</dd>
                <dt className="col-6 text-muted fw-normal">Department</dt>
                <dd className="col-6 text-end">{user.department ?? '—'}</dd>
                <dt className="col-6 text-muted fw-normal">Joined On</dt>
                <dd className="col-6 text-end">
                  {user.joinedOnUtc ? new Date(user.joinedOnUtc).toLocaleDateString() : '—'}
                </dd>
                <dt className="col-6 text-muted fw-normal">Status</dt>
                <dd className="col-6 text-end">
                  <Badge bg={user.isActive ? 'success' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                </dd>
              </dl>
            </Card.Body>
          </Card>

          <QuickActionsCard />
        </Col>

        <Col xs={12} lg={8} xl={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Tabs defaultActiveKey="profile-information" className="mb-4">
                <Tab eventKey="profile-information" title="Profile Information">
                  <div className="mb-4">
                    <h2 className="h6 fw-bold mb-3">Personal Information</h2>
                    <PersonalInfoPanel />
                  </div>
                  <AccountPreferencesPanel />
                </Tab>
                <Tab eventKey="security" title="Security">
                  <ChangePasswordForm />
                </Tab>
                <Tab eventKey="preferences" title="Preferences">
                  <NotificationPreferencesPanel />
                </Tab>
                <Tab eventKey="sessions" title="Sessions">
                  <SessionsPanel />
                </Tab>
                <Tab eventKey="activity-log" title="Activity Log">
                  <ActivityLogPanel />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}
