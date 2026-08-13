import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export type DashboardNavItem = 'Dashboard' | 'My Exams' | 'My Results' | 'Profile';

interface NavItem {
  label: DashboardNavItem;
  path: string | null;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'My Exams', path: '/exams' },
  { label: 'My Results', path: null },
  { label: 'Profile', path: '/profile' },
];

interface DashboardSidebarProps {
  active: DashboardNavItem;
}

export default function DashboardSidebar({ active }: DashboardSidebarProps) {
  return (
    <aside
      className="d-none d-md-flex flex-column text-white p-3 flex-shrink-0"
      style={{ width: 240, background: '#0f172a' }}
    >
      <div className="d-flex align-items-center gap-2 fw-bold mb-4 px-2 py-2">
        <BrandMark />
        ExamVault
      </div>
      <nav className="d-flex flex-column gap-1">
        {navItems.map((item) =>
          item.path ? (
            <Link
              key={item.label}
              to={item.path}
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
    </aside>
  );
}
