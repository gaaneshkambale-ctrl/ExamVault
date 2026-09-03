import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useFeatures } from '../hooks/useFeatures';

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

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (feature && !hasFeature(feature)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
