import { Card } from 'react-bootstrap';
import type { ReactNode } from 'react';
import type { DeltaResult } from '../../utils/dateRange';

interface ReportStatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: DeltaResult;
  deltaSuffix?: string;
  iconBg?: string;
  iconColor?: string;
}

export default function ReportStatCard({
  icon,
  label,
  value,
  delta,
  deltaSuffix = 'vs prior period',
  iconBg = '#eef2ff',
  iconColor = '#4f46e5',
}: ReportStatCardProps) {
  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div className="text-muted small">{label}</div>
          <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{ width: 32, height: 32, background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
        </div>
        <div className="h4 fw-bold mb-1">{value}</div>
        {delta && (
          <div
            className={`small fw-medium ${
              delta.direction === 'up' ? 'text-success' : delta.direction === 'down' ? 'text-danger' : 'text-muted'
            }`}
          >
            {delta.direction === 'up' && '▲ '}
            {delta.direction === 'down' && '▼ '}
            {delta.percent === null ? 'New' : `${Math.abs(delta.percent)}%`} {deltaSuffix}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
