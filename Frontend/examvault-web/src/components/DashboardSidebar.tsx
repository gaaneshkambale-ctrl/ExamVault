import BrandMark from './BrandMark';

const navItems = ['Dashboard', 'My Exams', 'My Results', 'Profile'] as const;

interface DashboardSidebarProps {
  active: (typeof navItems)[number];
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
        {navItems.map((item) => (
          <span
            key={item}
            className="px-3 py-2 rounded-2"
            style={
              item === active
                ? { background: '#4f46e5', color: 'white', fontWeight: 500 }
                : { color: '#94a3b8' }
            }
          >
            {item}
          </span>
        ))}
      </nav>
    </aside>
  );
}
