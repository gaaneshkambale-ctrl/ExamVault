import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Users', path: null },
  { label: 'Exams', path: '/admin/exams' },
  { label: 'Questions', path: null },
  { label: 'Categories', path: null },
  { label: 'Results', path: null },
  { label: 'Reports', path: null },
  { label: 'Notifications', path: null },
  { label: 'Settings', path: null },
] as const;

export type AdminNavItem = (typeof navItems)[number]['label'];

interface AdminSidebarProps {
  active: AdminNavItem;
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
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
        {navItems.map(({ label, path }) =>
          path ? (
            <Link
              key={label}
              to={path}
              className="px-3 py-2 rounded-2 text-decoration-none"
              style={
                label === active
                  ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                  : { color: '#94a3b8' }
              }
            >
              {label}
            </Link>
          ) : (
            <span key={label} className="px-3 py-2 rounded-2" style={{ color: '#475569' }}>
              {label}
            </span>
          ),
        )}
      </nav>
    </aside>
  );
}
