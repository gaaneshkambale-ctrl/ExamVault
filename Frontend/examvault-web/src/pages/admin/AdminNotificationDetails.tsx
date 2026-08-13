import AdminLayout from '../../layouts/AdminLayout';
import NotificationDetailContent from '../../components/notifications/NotificationDetailContent';

export default function AdminNotificationDetails() {
  return (
    <AdminLayout active="Notifications">
      <NotificationDetailContent />
    </AdminLayout>
  );
}
