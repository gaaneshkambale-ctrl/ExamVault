import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
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
  const { user } = useAuth();
  const navigate = useNavigate();

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

      <Card className="border-0 shadow-sm" style={{ maxWidth: 880 }}>
        <Card.Body className="p-4">
          <Row>
            <Col xs={12} sm={4} md={3} className="d-flex flex-column align-items-center text-center mb-4 mb-sm-0">
              <ProfileAvatarIllustration />
              <Button variant="outline-primary" size="sm" className="mt-3" disabled>
                Change Photo
              </Button>
            </Col>

            <Col xs={12} sm={8} md={9}>
              <ProfileField label="Full Name" value={user.fullName} />
              <ProfileField label="Email" value={user.email} />
              <ProfileField label="Role" value={user.role} />

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-primary" onClick={() => navigate('/change-password')}>
                  Change Password
                </Button>
                <Button variant="primary" disabled>
                  Update Profile
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Layout>
  );
}
