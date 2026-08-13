import type { ReactNode } from 'react';
import DashboardSidebar, { type DashboardNavItem } from '../components/DashboardSidebar';

interface StudentLayoutProps {
  active: DashboardNavItem;
  children: ReactNode;
}

export default function StudentLayout({ active, children }: StudentLayoutProps) {
  return (
    <div className="d-flex min-vh-100">
      <DashboardSidebar active={active} />
      <main className="flex-grow-1 bg-light">
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
