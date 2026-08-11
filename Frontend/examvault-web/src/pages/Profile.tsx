import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import DashboardSidebar from '../components/DashboardSidebar';
import ProfileAvatarIllustration from '../components/illustrations/ProfileAvatarIllustration';
import { useAuth } from '../hooks/useAuth';

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
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="d-flex min-vh-100">
      <DashboardSidebar active="Profile" />

      <main className="flex-grow-1 bg-light">
        <div className="container-fluid py-5 px-4 px-md-5" style={{ maxWidth: 880 }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h4 fw-bold mb-0">Profile</h1>
            <Button variant="outline-secondary" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>

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
                  <ProfileField label="Full Name" value={user.fullName} />
                  <ProfileField label="Email" value={user.email} />
                  <ProfileField label="Role" value={user.role} />

                  <div className="text-end">
                    <Button variant="primary" disabled>
                      Update Profile
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>
      </main>
    </div>
  );
}
