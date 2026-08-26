import { useState, type ReactNode } from 'react';
import BrandMark from '../components/BrandMark';
import DashboardSidebar, { type DashboardNavItem } from '../components/DashboardSidebar';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';

interface StudentLayoutProps {
  active: DashboardNavItem;
  children: ReactNode;
  // While taking an exam, the left nav and the rest of the top bar are a
  // distraction - and the profile dropdown's Profile/Logout links and the
  // notification bell are an easy way to navigate away mid-attempt, the
  // exact thing hiding the sidebar was meant to prevent. TakeExam renders
  // its own header (title, timers, Submit button) inside the page content,
  // so nothing here is actually needed while an exam is in progress.
  hideSidebar?: boolean;
}

export default function StudentLayout({ active, children, hideSidebar = false }: StudentLayoutProps) {
  const [showMobileNav, setShowMobileNav] = useState(false);

  return (
    <div className="d-flex min-vh-100">
      {!hideSidebar && (
        <DashboardSidebar active={active} show={showMobileNav} onClose={() => setShowMobileNav(false)} />
      )}
      <main className="flex-grow-1 bg-light">
        {!hideSidebar && (
          <div className="d-print-none d-flex justify-content-between justify-content-md-end align-items-center gap-3 px-4 px-md-5 py-3 bg-white border-bottom">
            <div className="d-flex d-md-none align-items-center gap-2 fw-bold text-primary">
              <BrandMark />
              ExamVault
            </div>
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
              <NotificationBell />
              <UserProfileMenu />
            </div>
          </div>
        )}
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
