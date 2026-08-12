import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export type AdminNavItem =
  | 'Dashboard'
  | 'Users'
  | 'Exams'
  | 'Exam Settings'
  | 'Exam Review & Publish'
  | 'Questions'
  | 'AI Generate Question'
  | 'AI Generate Question Preview'
  | 'Categories'
  | 'Results'
  | 'Reports'
  | 'Notifications'
  | 'Settings';

interface NavChild {
  label: AdminNavItem;
  path: string;
}

interface NavItem {
  label: AdminNavItem;
  path: string | null;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Users', path: null },
  {
    label: 'Exams',
    path: '/admin/exams',
    children: [
      { label: 'Exam Settings', path: '/admin/exams' },
      { label: 'Exam Review & Publish', path: '/admin/exams' },
    ],
  },
  {
    label: 'Questions',
    path: '/admin/questions',
    children: [
      { label: 'AI Generate Question', path: '/admin/questions/ai-generate' },
      { label: 'AI Generate Question Preview', path: '/admin/questions/ai-generate/preview' },
    ],
  },
  { label: 'Categories', path: null },
  { label: 'Results', path: null },
  { label: 'Reports', path: null },
  { label: 'Notifications', path: null },
  { label: 'Settings', path: null },
];

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
        {navItems.map((item) => (
          <div key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                className="px-3 py-2 rounded-2 text-decoration-none d-block"
                style={
                  item.label === active
                    ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                    : { color: '#94a3b8' }
                }
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-3 py-2 rounded-2 d-block" style={{ color: '#475569' }}>
                {item.label}
              </span>
            )}
            {item.children && (
              <div className="d-flex flex-column gap-1 mt-1">
                {item.children.map((child) => (
                  <Link
                    key={child.label}
                    to={child.path}
                    className="py-1 rounded-2 text-decoration-none small d-block"
                    style={{
                      paddingLeft: '2.25rem',
                      paddingRight: '0.75rem',
                      ...(child.label === active
                        ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                        : { color: '#94a3b8' }),
                    }}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
