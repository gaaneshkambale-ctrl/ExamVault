import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useFeatures } from '../hooks/useFeatures';
import { dashboardPathForRole } from '../utils/roleRouting';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Array<'Student' | 'Admin' | 'SuperAdmin' | 'Instructor'>;
  // Matches a PlanFeature name - mirrors the backend's own Feature: policy
  // (SuperAdmin bypass included, see useFeatures.ts) so a tenant whose Plan
  // no longer includes this feature can't reach the page by URL even with
  // the sidebar link already hidden (AdminSidebar.tsx's own feature gate).
  feature?: string;
}

export default function ProtectedRoute({ children, roles, feature }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasFeature } = useFeatures();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ forced: true }} />;
  }

  // Both branches below used to bounce to "/" - the public marketing
  // homepage, which has no login-state awareness at all (Home.tsx renders
  // unconditionally). To a still-logged-in Admin whose org lost a feature
  // (the common, everyday way this fires - naturally clicking their own
  // sidebar, not poking at a stray URL) that looked exactly like being
  // logged out. Land them back on their own dashboard instead.
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  if (feature && user && !hasFeature(feature)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}
