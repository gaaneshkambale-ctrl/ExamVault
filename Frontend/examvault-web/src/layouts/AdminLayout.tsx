import type { ReactNode } from 'react';
import AdminSidebar, { type AdminNavItem } from '../components/AdminSidebar';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';

interface AdminLayoutProps {
  active: AdminNavItem;
  children: ReactNode;
}

export default function AdminLayout({ active, children }: AdminLayoutProps) {
  return (
    <div className="d-flex min-vh-100">
      <AdminSidebar active={active} />
      <main className="flex-grow-1 bg-light">
        <div className="d-flex justify-content-end align-items-center gap-3 px-4 px-md-5 py-3 bg-white border-bottom">
          <NotificationBell />
          <UserProfileMenu />
        </div>
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
