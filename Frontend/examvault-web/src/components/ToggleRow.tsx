import { Form } from 'react-bootstrap';

interface ToggleRowProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  // Real, controlled usage (Security/Platform Settings' now-live fields) -
  // when provided, this row is a genuine editable toggle instead of the
  // disabled illustrative-example switch every other field on these pages
  // still is (see each page's own disclosure note for which is which).
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export default function ToggleRow({ label, description, defaultChecked, checked, onChange, disabled = true }: ToggleRowProps) {
  const isControlled = checked !== undefined;
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
      <Form.Check
        type="switch"
        defaultChecked={isControlled ? undefined : defaultChecked}
        checked={isControlled ? checked : undefined}
        onChange={isControlled ? (e) => onChange?.(e.target.checked) : undefined}
        disabled={isControlled ? disabled : true}
        className="flex-shrink-0"
      />
    </div>
  );
}
