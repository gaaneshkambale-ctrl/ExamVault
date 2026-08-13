import type { ReactNode } from 'react';
import DashboardSidebar, { type DashboardNavItem } from '../components/DashboardSidebar';
import NotificationBell from '../components/NotificationBell';

interface StudentLayoutProps {
  active: DashboardNavItem;
  children: ReactNode;
}

export default function StudentLayout({ active, children }: StudentLayoutProps) {
  return (
    <div className="d-flex min-vh-100">
      <DashboardSidebar active={active} />
      <main className="flex-grow-1 bg-light">
        <div className="d-flex justify-content-end align-items-center px-4 px-md-5 py-3 bg-white border-bottom">
          <NotificationBell />
        </div>
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
