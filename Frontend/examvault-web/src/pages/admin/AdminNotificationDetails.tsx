import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import NotificationDetailContent from '../../components/notifications/NotificationDetailContent';

export default function AdminNotificationDetails() {
  return (
    <RoleAwareLayout active="Notifications">
      <NotificationDetailContent />
    </RoleAwareLayout>
  );
}
