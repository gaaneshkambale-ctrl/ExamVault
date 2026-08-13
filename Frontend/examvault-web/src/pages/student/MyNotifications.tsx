import StudentLayout from '../../layouts/StudentLayout';
import NotificationsListContent from '../../components/notifications/NotificationsListContent';

export default function MyNotifications() {
  return (
    <StudentLayout active="Notifications">
      <NotificationsListContent />
    </StudentLayout>
  );
}
