import { useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  centerLabel?: string;
}

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutChart({ data, centerLabel }: DonutChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <div className="text-center text-muted py-5 small">Not enough data yet.</div>;
  }

  let offset = 0;
  const arcs = data.map((d, i) => {
    const fraction = d.value / total;
    const dash = fraction * CIRCUMFERENCE;
    const arc = { ...d, dash, gap: CIRCUMFERENCE - dash, offset, index: i };
    offset -= dash;
    return arc;
  });

  return (
    <div className="d-flex align-items-center gap-4 flex-wrap">
      <div className="position-relative" style={{ width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`translate(${SIZE / 2}, ${SIZE / 2}) rotate(-90)`}>
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                opacity={hoverIndex === null || hoverIndex === arc.index ? 1 : 0.4}
                onPointerEnter={() => setHoverIndex(arc.index)}
                onPointerLeave={() => setHoverIndex(null)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </g>
        </svg>
        <div
          className="position-absolute top-50 start-50 translate-middle text-center"
          style={{ pointerEvents: 'none' }}
        >
          <div className="h5 fw-bold mb-0">
            {hoverIndex !== null ? arcs[hoverIndex].value.toLocaleString() : total.toLocaleString()}
          </div>
          <div className="text-muted small">
            {hoverIndex !== null ? arcs[hoverIndex].label : (centerLabel ?? 'Total')}
          </div>
        </div>
      </div>

      <div className="d-flex flex-column gap-2">
        {arcs.map((arc) => (
          <div
            key={arc.label}
            className="d-flex align-items-center gap-2 small"
            style={{ cursor: 'pointer', opacity: hoverIndex === null || hoverIndex === arc.index ? 1 : 0.5 }}
            onPointerEnter={() => setHoverIndex(arc.index)}
            onPointerLeave={() => setHoverIndex(null)}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: arc.color, display: 'inline-block' }} />
            <span>
              {arc.label} <span className="text-muted">{arc.value.toLocaleString()} ({Math.round((arc.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
