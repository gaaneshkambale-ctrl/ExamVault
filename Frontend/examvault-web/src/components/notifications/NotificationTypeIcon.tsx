import type { ReactNode } from 'react';
import type { NotificationType } from '../../types/notification';

const typeMeta: Record<NotificationType, { bg: string; fg: string; icon: string }> = {
  Exam: { bg: '#e0e7ff', fg: '#4338ca', icon: 'exam' },
  Reminder: { bg: '#dbeafe', fg: '#1d4ed8', icon: 'bell' },
  Result: { bg: '#fef3c7', fg: '#b45309', icon: 'trophy' },
  System: { bg: '#fee2e2', fg: '#b91c1c', icon: 'megaphone' },
  Account: { bg: '#e5e7eb', fg: '#374151', icon: 'user' },
};

interface NotificationTypeIconProps {
  type: NotificationType;
  size?: number;
}

export default function NotificationTypeIcon({ type, size = 40 }: NotificationTypeIconProps) {
  const meta = typeMeta[type];
  const paths: Record<string, ReactNode> = {
    exam: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </>
    ),
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />,
    trophy: (
      <>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 5h3a3 3 0 0 1-3 5M7 5H4a3 3 0 0 0 3 5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    megaphone: <path d="M3 11v2a1 1 0 0 0 1 1h2l6 4V6l-6 4H4a1 1 0 0 0-1 1zM17 8a4 4 0 0 1 0 8" strokeLinecap="round" strokeLinejoin="round" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <div
      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: meta.bg, color: meta.fg }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {paths[meta.icon]}
      </svg>
    </div>
  );
}
