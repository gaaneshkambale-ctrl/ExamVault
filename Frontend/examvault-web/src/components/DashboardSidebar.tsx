import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';
import { usePermissions } from '../hooks/usePermissions';
import { useLiveExamCount } from '../hooks/useLiveExamCount';
import { useResultsAndCertificatesCounts } from '../hooks/useResultsAndCertificatesCounts';
import { useUnreadCount } from '../hooks/useNotifications';
import {
  CertificatesIcon,
  DashboardIcon,
  ExamsIcon,
  NotificationsIcon,
  ResultsIcon,
  SettingsIcon,
} from './icons/StudentNavIcons';

export type DashboardNavItem =
  | 'Dashboard'
  | 'My Exams'
  | 'My Results'
  | 'My Certificates'
  | 'Profile'
  | 'Notifications'
  | 'Settings';

interface NavItem {
  label: DashboardNavItem;
  path: string | null;
  icon: ReactNode;
}

// No "Profile" entry here - it's already one click away via the top bar's
// UserProfileMenu ("My Profile"), so a second link to the same /profile
// route in the sidebar was pure duplication. 'Profile' stays in
// DashboardNavItem (Profile.tsx still passes active="Profile" to whichever
// layout renders it) - only the clickable nav entry itself is gone.
const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'My Exams', path: '/exams', icon: <ExamsIcon /> },
  { label: 'My Results', path: '/results', icon: <ResultsIcon /> },
  { label: 'My Certificates', path: '/certificates', icon: <CertificatesIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

interface DashboardSidebarProps {
  active: DashboardNavItem;
  show?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ active, show = false, onClose = () => {} }: DashboardSidebarProps) {
  const { hasPermission } = usePermissions();
  // This layout is Student-only (Admin/Instructor use AdminLayout/
  // InstructorLayout) - Results - View is a real, revocable Student
  // default permission (ResultsController enforces it with no role
  // restriction at all), so hide the nav item rather than leave a link
  // that 403s.
  const visibleNavItems = navItems.filter((item) => item.label !== 'My Results' || hasPermission('Results - View'));
  // Each of these mirrors a real count the destination page itself computes
  // (or, for Notifications, the same unread count the top-bar bell already
  // shows) - not a new definition invented just for the sidebar. Runs on
  // every page since this sidebar is global; the per-exam queries behind
  // Live/Results/Certificates are the same ones those pages already pay for
  // their own counts, not new cost.
  const liveExamCount = useLiveExamCount();
  const { resultsCount, certificatesCount } = useResultsAndCertificatesCounts();
  const { data: unread } = useUnreadCount();
  const badgeCountByLabel: Partial<Record<DashboardNavItem, number>> = {
    'My Exams': liveExamCount,
    'My Results': resultsCount,
    'My Certificates': certificatesCount,
    Notifications: unread?.count ?? 0,
  };

  return (
    <Offcanvas
      show={show}
      onHide={onClose}
      responsive="md"
      className="flex-shrink-0 d-print-none"
      style={{ width: 240 }}
    >
      <div className="d-flex flex-column h-100 text-white" style={{ background: '#0f172a' }}>
        <Offcanvas.Header closeButton closeVariant="white" className="d-md-none">
          <Offcanvas.Title className="d-flex align-items-center gap-2 fw-bold">
            <BrandMark />
            ExamVault
          </Offcanvas.Title>
        </Offcanvas.Header>
        <div className="d-flex flex-column flex-grow-1 p-3 pt-0 pt-md-3">
          <div className="d-none d-md-flex align-items-center gap-2 fw-bold mb-4 px-2 py-2">
            <BrandMark />
            ExamVault
          </div>
          <nav className="d-flex flex-column gap-1 flex-grow-1">
            {visibleNavItems.map((item) =>
              item.path ? (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onClose}
                  className="px-3 py-2 rounded-2 text-decoration-none d-flex align-items-center gap-2"
                  style={
                    item.label === active
                      ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                      : { color: '#94a3b8' }
                  }
                >
                  {item.icon}
                  {item.label}
                  {!!badgeCountByLabel[item.label] && (
                    <Badge bg="danger" pill className="ms-auto" style={{ fontSize: 10 }}>
                      {badgeCountByLabel[item.label]! > 9 ? '9+' : badgeCountByLabel[item.label]}
                    </Badge>
                  )}
                </Link>
              ) : (
                <span key={item.label} className="px-3 py-2 rounded-2 d-flex align-items-center gap-2" style={{ color: '#475569' }}>
                  {item.icon}
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </div>
      </div>
    </Offcanvas>
  );
}
