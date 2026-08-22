import type { ReactNode } from 'react';

// Hand-rolled SVG ring, matching this codebase's existing no-chart-library
// convention (see ExamsTrendChart.tsx) rather than adding a dependency for
// one widget.
interface PercentageRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}

export default function PercentageRing({
  percentage,
  size = 160,
  strokeWidth = 14,
  color = '#4f46e5',
  trackColor = '#e5e7eb',
  children,
}: PercentageRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="position-relative d-inline-flex align-items-center justify-content-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="position-absolute text-center">{children}</div>
    </div>
  );
}
