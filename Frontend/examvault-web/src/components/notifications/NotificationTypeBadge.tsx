import { Badge } from 'react-bootstrap';
import type { NotificationType } from '../../types/notification';

const typeVariant: Record<NotificationType, string> = {
  Exam: 'primary',
  Reminder: 'warning',
  Result: 'info',
  System: 'secondary',
  Account: 'dark',
  Announcement: 'primary',
  Alert: 'danger',
};

export default function NotificationTypeBadge({ type }: { type: NotificationType }) {
  return <Badge bg={typeVariant[type]}>{type}</Badge>;
}
