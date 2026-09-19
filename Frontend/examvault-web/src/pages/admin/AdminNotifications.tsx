import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import NotificationsListContent from '../../components/notifications/NotificationsListContent';

export default function AdminNotifications() {
  return (
    <RoleAwareLayout active="Notifications">
      <NotificationsListContent />
    </RoleAwareLayout>
  );
}
