import { useState } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendSeries {
  name: string;
  color: string;
  data: TrendPoint[];
  // When set, this series is rendered/labeled as a percentage (0-100) even
  // though the other series on the same chart may be raw counts.
  isPercent?: boolean;
}

interface LineTrendChartProps {
  series: TrendSeries[];
  height?: number;
  // Roughly how many x-axis labels to show; the rest are thinned out so
  // long ranges (e.g. 90 days) don't overlap.
  maxLabels?: number;
}

const WIDTH = 600;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const PAD_X = 12;

export default function LineTrendChart({ series, height = 240, maxLabels = 8 }: LineTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const pointCount = series[0]?.data.length ?? 0;
  const hasData = series.length > 0 && pointCount > 0 && series.some((s) => s.data.some((d) => d.value > 0));

  if (!hasData) {
    return <div className="text-center text-muted py-5 small">Not enough data yet.</div>;
  }

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const stepX = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;

  const maxValue = Math.max(1, ...series.flatMap((s) => s.data.map((d) => d.value)));

  const linesWithPoints = series.map((s) => {
    const points = s.data.map((d, i) => ({
      x: PAD_X + stepX * i,
      y: PAD_TOP + plotHeight - (d.value / maxValue) * plotHeight,
      value: d.value,
      label: d.label,
    }));
    return { ...s, points };
  });

  const labelEvery = Math.max(1, Math.ceil(pointCount / maxLabels));
  const labelIndices = new Set<number>();
  for (let i = 0; i < pointCount; i += labelEvery) labelIndices.add(i);
  const lastRegularLabel = Math.max(0, ...labelIndices);
  if (pointCount - 1 - lastRegularLabel >= labelEvery / 2) {
    labelIndices.add(pointCount - 1);
  }

  return (
    <div className="position-relative">
      <div className="d-flex align-items-center gap-3 mb-2 small text-muted">
        {series.map((s) => (
          <span key={s.name} className="d-flex align-items-center gap-1">
            <span
              style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }}
            />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-100" style={{ display: 'block' }}>
        <line
          x1={PAD_X}
          y1={PAD_TOP + plotHeight}
          x2={WIDTH - PAD_X}
          y2={PAD_TOP + plotHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {linesWithPoints.map((s) => {
          const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return <path key={s.name} d={path} fill="none" stroke={s.color} strokeWidth={2} />;
        })}

        {Array.from({ length: pointCount }).map((_, i) => {
          if (!labelIndices.has(i)) return null;
          const x = PAD_X + stepX * i;
          return (
            <text key={i} x={x} y={height - 8} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {series[0].data[i].label}
            </text>
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={PAD_X + stepX * hoverIndex}
            y1={PAD_TOP}
            x2={PAD_X + stepX * hoverIndex}
            y2={PAD_TOP + plotHeight}
            stroke="#c7d2fe"
            strokeWidth={1}
          />
        )}

        {linesWithPoints.map((s) =>
          s.points.map((p, i) => (
            <circle
              key={`${s.name}-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 4 : 0}
              fill={s.color}
            />
          )),
        )}

        <rect
          x={PAD_X}
          y={0}
          width={plotWidth}
          height={height}
          fill="transparent"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const ratio = relX / rect.width;
            const index = Math.round(ratio * (pointCount - 1));
            setHoverIndex(Math.min(pointCount - 1, Math.max(0, index)));
          }}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hoverIndex !== null && (
        <div
          className="position-absolute bg-dark text-white rounded-2 px-2 py-1 small"
          style={{
            left: `${((PAD_X + stepX * hoverIndex) / WIDTH) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div className="fw-bold">{series[0].data[hoverIndex]?.label}</div>
          {linesWithPoints.map((s) => (
            <div key={s.name}>
              {s.name}: {s.points[hoverIndex].value}
              {s.isPercent ? '%' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
