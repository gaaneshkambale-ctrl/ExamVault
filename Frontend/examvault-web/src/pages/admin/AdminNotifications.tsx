import AdminLayout from '../../layouts/AdminLayout';
import NotificationsListContent from '../../components/notifications/NotificationsListContent';

export default function AdminNotifications() {
  return (
    <AdminLayout active="Notifications">
      <NotificationsListContent />
    </AdminLayout>
  );
}
