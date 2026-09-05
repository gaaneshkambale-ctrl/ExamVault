import PlatformLayout from '../../layouts/PlatformLayout';

interface PlatformComingSoonProps {
  active: string;
  parent: string;
  title: string;
}

// Honest placeholder for every Super Admin menu item that doesn't have a
// backend yet (see ExamVault Super Admin Menu.txt's IMPLEMENTATION NOTES) -
// never a dead/hidden nav item, never faked data.
export default function PlatformComingSoon({ active, parent, title }: PlatformComingSoonProps) {
  return (
    <PlatformLayout active={active}>
      <p className="text-muted small mb-1">{parent === 'Platform Admin' ? parent : `Platform Admin / ${parent}`}</p>
      <h1 className="h4 fw-bold mb-3 text-primary">{title}</h1>
      <div className="border rounded-3 bg-body p-5 text-center text-muted">
        <p className="mb-0">"{title}" isn't connected yet - this section of the Super Admin panel is still being built.</p>
      </div>
    </PlatformLayout>
  );
}
