import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
import ProfileAvatarIllustration from '../components/illustrations/ProfileAvatarIllustration';
import PersonalInfoPanel from '../components/profile/PersonalInfoPanel';
import ChangePasswordForm from '../components/profile/ChangePasswordForm';
import SessionsPanel from '../components/profile/SessionsPanel';
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

      <h1 className="h4 fw-bold mb-4">Profile</h1>

      <Card className="border-0 shadow-sm" style={{ maxWidth: 960 }}>
        <Card.Body className="p-4">
          <Row>
            <Col xs={12} sm={4} md={3} className="mb-4 mb-sm-0">
              <ProfilePhoto />
            </Col>

            <Col xs={12} sm={8} md={9}>
              <Tabs defaultActiveKey="personal" className="mb-4">
                <Tab eventKey="personal" title="Personal Info">
                  <PersonalInfoPanel />
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
              </Tabs>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Layout>
  );
}
