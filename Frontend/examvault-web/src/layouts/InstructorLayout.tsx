import { useState, type ReactNode } from 'react';
import InstructorSidebar, { type InstructorNavItem } from '../components/InstructorSidebar';
import BrandMark from '../components/BrandMark';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';

interface InstructorLayoutProps {
  active: InstructorNavItem;
  children: ReactNode;
}

export default function InstructorLayout({ active, children }: InstructorLayoutProps) {
  const [showMobileNav, setShowMobileNav] = useState(false);

  return (
    <div className="d-flex min-vh-100">
      <InstructorSidebar active={active} show={showMobileNav} onClose={() => setShowMobileNav(false)} />
      <main className="flex-grow-1 bg-body-tertiary">
        <div className="d-flex justify-content-between justify-content-md-end align-items-center gap-3 px-4 px-md-5 py-3 bg-body border-bottom">
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
        <div className="container-fluid py-5 px-4 px-md-5">{children}</div>
      </main>
    </div>
  );
}
