import { Card } from 'react-bootstrap';
import AdminLayout from '../../layouts/AdminLayout';
import type { AdminNavItem } from '../AdminSidebar';

interface AdminComingSoonProps {
  active: AdminNavItem;
  title: string;
  description: string;
}

export default function AdminComingSoon({ active, title, description }: AdminComingSoonProps) {
  return (
    <AdminLayout active={active}>
      <h1 className="h4 fw-bold mb-1 text-primary">{title}</h1>
      <p className="text-muted mb-4">{description}</p>

      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center text-muted py-5">Coming soon.</Card.Body>
      </Card>
    </AdminLayout>
  );
}
