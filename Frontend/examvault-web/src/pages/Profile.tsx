import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import DashboardSidebar from '../components/DashboardSidebar';
import ProfileAvatarIllustration from '../components/illustrations/ProfileAvatarIllustration';
import { getUserProfile } from '../api/userApi';

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <Form.Group as={Row} className="mb-3 align-items-center">
      <Form.Label column sm={3} className="text-muted">
        {label}
      </Form.Label>
      <Col sm={9}>
        <Form.Control value={value} readOnly />
      </Col>
    </Form.Group>
  );
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['userProfile', id],
    queryFn: () => getUserProfile(id!),
    enabled: !!id,
  });

  return (
    <div className="d-flex min-vh-100">
      <DashboardSidebar active="Profile" />

      <main className="flex-grow-1 bg-light">
        <div className="container-fluid py-5 px-4 px-md-5" style={{ maxWidth: 880 }}>
          <h1 className="h4 fw-bold mb-4">Profile</h1>

          {isLoading && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              Loading profile...
            </div>
          )}

          {isError && <p className="text-danger">Could not load this profile.</p>}

          {profile && (
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Row>
                  <Col
                    xs={12}
                    sm={4}
                    md={3}
                    className="d-flex flex-column align-items-center text-center mb-4 mb-sm-0"
                  >
                    <ProfileAvatarIllustration />
                    <Button variant="outline-primary" size="sm" className="mt-3">
                      Change Photo
                    </Button>
                  </Col>

                  <Col xs={12} sm={8} md={9}>
                    <ProfileField label="Full Name" value={profile.fullName} />
                    <ProfileField label="Email" value={profile.email} />
                    <ProfileField label="Role" value={profile.role} />

                    <div className="text-end">
                      <Button variant="primary" disabled>
                        Update Profile
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
