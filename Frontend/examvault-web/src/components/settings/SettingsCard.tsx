import type { ReactNode } from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export interface SettingsCardRow {
  label: string;
  value: ReactNode;
}

interface SettingsCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  rows: SettingsCardRow[];
  manageLabel: string;
  manageTo: string;
  manageColor: string;
}

export default function SettingsCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  rows,
  manageLabel,
  manageTo,
  manageColor,
}: SettingsCardProps) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4 d-flex flex-column">
        <div className="d-flex align-items-start gap-3 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{ width: 48, height: 48, background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div>
            <div className="fw-bold" style={{ color: manageColor }}>
              {title}
            </div>
            <div className="text-muted small">{subtitle}</div>
          </div>
        </div>

        <div className="flex-grow-1 mb-3">
          {rows.map((row) => (
            <div key={row.label} className="d-flex justify-content-between align-items-center py-2 border-bottom small">
              <span className="text-muted">{row.label}</span>
              <span className="fw-medium text-end">{row.value}</span>
            </div>
          ))}
        </div>

        <Link
          to={manageTo}
          className="btn btn-sm fw-medium d-flex align-items-center justify-content-center gap-1"
          style={{ background: iconBg, color: manageColor, border: 'none' }}
        >
          {manageLabel}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </Card.Body>
    </Card>
  );
}
