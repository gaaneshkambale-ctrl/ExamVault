import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import BrandMark from './BrandMark';

export type InstructorNavItem = 'Dashboard' | 'Exams' | 'Profile';

interface NavItem {
  label: InstructorNavItem;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/instructor/dashboard' },
  { label: 'Exams', path: '/admin/exams' },
];

const iconPaths: Partial<Record<InstructorNavItem, ReactNode>> = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  Exams: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
};

function NavIcon({ label }: { label: InstructorNavItem }) {
  const path = iconPaths[label];
  if (!path) return null;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      {path}
    </svg>
  );
}

interface InstructorSidebarProps {
  active: InstructorNavItem;
  show?: boolean;
  onClose?: () => void;
}

export default function InstructorSidebar({ active, show = false, onClose = () => {} }: InstructorSidebarProps) {
  return (
    <Offcanvas show={show} onHide={onClose} responsive="md" className="flex-shrink-0" style={{ width: 240 }}>
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
            {navItems.map((item) => (
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
                <NavIcon label={item.label} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </Offcanvas>
  );
}
