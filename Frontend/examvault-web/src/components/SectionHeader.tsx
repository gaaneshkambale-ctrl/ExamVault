import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// Icon-box + title (+ optional subtitle/action) header used at the top of a
// card section, matching the pattern established across the Create Exam
// wizard, Assign Exam wizard, and Admin Dashboard.
export default function SectionHeader({ icon, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="d-flex align-items-center gap-2">
        <div
          className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
          style={{ width: 32, height: 32, background: '#eef2ff' }}
        >
          {icon}
        </div>
        <div>
          <h2 className="h6 fw-bold mb-0">{title}</h2>
          {subtitle && <div className="text-muted small">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
