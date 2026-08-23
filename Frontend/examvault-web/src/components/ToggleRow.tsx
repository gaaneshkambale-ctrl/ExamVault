import { Form } from 'react-bootstrap';

interface ToggleRowProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}

// Static, disabled switch row for the Settings pages (setting.png) - the
// on/off state shown is the mockup's illustrative example, not a real
// persisted preference (nothing behind these pages is wired to a
// backend - see each page's own disclosure note).
export default function ToggleRow({ label, description, defaultChecked }: ToggleRowProps) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 py-2 border-bottom">
      <div>
        <div className="fw-medium small">{label}</div>
        {description && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            {description}
          </div>
        )}
      </div>
      <Form.Check type="switch" defaultChecked={defaultChecked} disabled className="flex-shrink-0" />
    </div>
  );
}
