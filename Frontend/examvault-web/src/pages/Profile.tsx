import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button, Card, Spinner } from 'react-bootstrap';
import DashboardSidebar from '../components/DashboardSidebar';
import { getUserProfile } from '../api/userApi';

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
        <div className="container-fluid py-5 px-4 px-md-5" style={{ maxWidth: 640 }}>
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
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                    style={{
                      width: 72,
                      height: 72,
                      background: 'linear-gradient(160deg, #6366f1, #4338ca)',
                      fontSize: 26,
                    }}
                  >
                    {profile.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Button variant="outline-secondary" size="sm">
                      Change Photo
                    </Button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small">Full Name</div>
                  <div className="fw-medium">{profile.fullName}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Email</div>
                  <div className="fw-medium">{profile.email}</div>
                </div>
                <div className="mb-4">
                  <div className="text-muted small">Role</div>
                  <div className="fw-medium">{profile.role}</div>
                </div>

                <div className="text-end">
                  <Button variant="primary" disabled>
                    Update Profile
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
