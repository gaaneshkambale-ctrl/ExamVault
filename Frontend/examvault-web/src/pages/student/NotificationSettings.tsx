import AdminLayout from '../../layouts/AdminLayout';
import StudentLayout from '../../layouts/StudentLayout';
import { useAuth } from '../../hooks/useAuth';
import NotificationPreferencesPanel from '../../components/NotificationPreferencesPanel';

export default function NotificationSettings() {
  const { user } = useAuth();

  if (user?.role === 'Admin') {
    return (
      <AdminLayout active="Settings">
        <NotificationPreferencesPanel />
      </AdminLayout>
    );
  }

  return (
    <StudentLayout active="Notifications">
      <NotificationPreferencesPanel />
    </StudentLayout>
  );
}
