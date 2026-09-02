import type { ReactNode } from 'react';
import AdminLayout from './AdminLayout';
import InstructorLayout from './InstructorLayout';
import type { InstructorNavItem } from '../components/InstructorSidebar';
import { useAuth } from '../hooks/useAuth';

interface RoleAwareLayoutProps {
  // Exam/question-authoring pages only ever pass a nav label both Admin's
  // and Instructor's sidebars recognize (InstructorNavItem is a subset of
  // AdminLayout's AdminNavItem), so the same value works for either layout.
  active: InstructorNavItem;
  children: ReactNode;
}

export default function RoleAwareLayout({ active, children }: RoleAwareLayoutProps) {
  const { user } = useAuth();

  if (user?.role === 'Instructor') {
    return <InstructorLayout active={active}>{children}</InstructorLayout>;
  }

  return <AdminLayout active={active}>{children}</AdminLayout>;
}
