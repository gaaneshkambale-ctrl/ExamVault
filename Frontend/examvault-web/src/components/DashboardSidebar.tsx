import { Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';

export type DashboardNavItem =
  | 'Dashboard'
  | 'My Exams'
  | 'Upcoming Exams'
  | 'My Results'
  | 'My Certificates'
  | 'Profile'
  | 'Notifications'
  | 'Settings';

interface NavItem {
  label: DashboardNavItem;
  path: string | null;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'My Exams', path: '/exams' },
  { label: 'Upcoming Exams', path: '/exams?tab=Upcoming' },
  { label: 'My Results', path: '/results' },
  { label: 'My Certificates', path: '/certificates' },
  { label: 'Profile', path: '/profile' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Settings', path: null },
];

interface DashboardSidebarProps {
  active: DashboardNavItem;
  show?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ active, show = false, onClose = () => {} }: DashboardSidebarProps) {
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
            {navItems.map((item) =>
              item.path ? (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onClose}
                  className="px-3 py-2 rounded-2 text-decoration-none"
                  style={
                    item.label === active
                      ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                      : { color: '#94a3b8' }
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="px-3 py-2 rounded-2" style={{ color: '#475569' }}>
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
