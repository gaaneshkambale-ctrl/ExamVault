import type { ReactNode } from 'react';
import BrandMark from '../components/BrandMark';
import DashboardSidebar, { type DashboardNavItem } from '../components/DashboardSidebar';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';

interface StudentLayoutProps {
  active: DashboardNavItem;
  children: ReactNode;
}

export default function StudentLayout({ active, children }: StudentLayoutProps) {
  return (
    <div className="d-flex min-vh-100">
      <DashboardSidebar active={active} />
      <main className="flex-grow-1 bg-light">
        <div className="d-flex justify-content-between justify-content-md-end align-items-center gap-3 px-4 px-md-5 py-3 bg-white border-bottom">
          <div className="d-flex d-md-none align-items-center gap-2 fw-bold text-primary">
            <BrandMark />
            ExamVault
          </div>
          <div className="d-flex align-items-center gap-3">
            <NotificationBell />
            <UserProfileMenu />
          </div>
        </div>
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
