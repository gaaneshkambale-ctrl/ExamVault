import { useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
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
  const navigate = useNavigate();
  const [showMobileNav, setShowMobileNav] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="d-flex min-vh-100">
      {user.role === 'Admin' ? (
        <AdminSidebar active="Profile" show={showMobileNav} onClose={() => setShowMobileNav(false)} />
      ) : (
        <DashboardSidebar active="Profile" show={showMobileNav} onClose={() => setShowMobileNav(false)} />
      )}

      <main className="flex-grow-1 bg-light">
        <div className="container-fluid py-5 px-4 px-md-5" style={{ maxWidth: 880 }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMobileNav(true)}
                aria-label="Open menu"
                className="btn p-0 border-0 bg-transparent d-md-none d-flex align-items-center"
                style={{ fontSize: 20, lineHeight: 1, color: '#0f172a' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <h1 className="h4 fw-bold mb-0">Profile</h1>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => void handleLogout()}>
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
        </div>
      </main>
    </div>
  );
}
