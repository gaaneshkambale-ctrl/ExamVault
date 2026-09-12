import { useState } from 'react';

export interface ComboSeries {
  name: string;
  color: string;
  data: number[];
}

interface BarLineComboChartProps {
  labels: string[];
  bars: ComboSeries;
  line: ComboSeries;
  height?: number;
}

// Bars and the line are scaled independently against their own max (a left
// axis for the bars, a right axis for the line) since the two series are
// different units (exam counts vs. participant counts) - same hand-rolled
// SVG approach as ScoreDistributionChart (bar geometry) and LineTrendChart
// (line path + hover), merged into one chart with two scales.
const WIDTH = 600;
const PAD_TOP = 24;
const PAD_BOTTOM = 28;
const PAD_X = 32;
const GAP_RATIO = 0.4;

export default function BarLineComboChart({ labels, bars, line, height = 260 }: BarLineComboChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasData = labels.length > 0 && (bars.data.some((v) => v > 0) || line.data.some((v) => v > 0));
  if (!hasData) {
    return <div className="text-center text-muted py-5 small">Not enough data yet.</div>;
  }

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const slotWidth = plotWidth / labels.length;
  const barWidth = slotWidth * (1 - GAP_RATIO);

  const barMax = Math.max(1, ...bars.data);
  const lineMax = Math.max(1, ...line.data);

  const barRects = labels.map((label, i) => {
    const value = bars.data[i] ?? 0;
    const barHeight = (value / barMax) * plotHeight;
    return {
      label,
      value,
      x: PAD_X + slotWidth * i + (slotWidth - barWidth) / 2,
      y: PAD_TOP + plotHeight - barHeight,
      width: barWidth,
      height: barHeight,
      centerX: PAD_X + slotWidth * i + slotWidth / 2,
    };
  });

  const linePoints = labels.map((label, i) => {
    const value = line.data[i] ?? 0;
    return {
      label,
      value,
      x: PAD_X + slotWidth * i + slotWidth / 2,
      y: PAD_TOP + plotHeight - (value / lineMax) * plotHeight,
    };
  });
  const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const hovered = hoverIndex !== null ? { bar: barRects[hoverIndex], line: linePoints[hoverIndex] } : null;

  return (
    <div className="position-relative">
      <div className="d-flex align-items-center gap-3 mb-2 small text-muted">
        <span className="d-flex align-items-center gap-1">
          <span style={{ width: 10, height: 10, borderRadius: 2, background: bars.color, display: 'inline-block' }} />
          {bars.name}
        </span>
        <span className="d-flex align-items-center gap-1">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: line.color, display: 'inline-block' }} />
          {line.name}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-100" style={{ display: 'block' }}>
        <line x1={PAD_X} y1={PAD_TOP + plotHeight} x2={WIDTH - PAD_X} y2={PAD_TOP + plotHeight} stroke="#e5e7eb" strokeWidth={1} />

        <text x={PAD_X - 6} y={PAD_TOP + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
          {barMax}
        </text>
        <text x={WIDTH - PAD_X + 6} y={PAD_TOP + 4} textAnchor="start" fontSize={10} fill="#9ca3af">
          {lineMax}
        </text>

        {barRects.map((bar, i) => (
          <g key={bar.label}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(bar.height, 0)}
              rx={4}
              fill={bars.color}
              fillOpacity={hoverIndex === null || hoverIndex === i ? 1 : 0.5}
            />
            <text x={bar.centerX} y={height - 8} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {bar.label}
            </text>
          </g>
        ))}

        <path d={linePath} fill="none" stroke={line.color} strokeWidth={2} />
        {linePoints.map((p, i) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={hoverIndex === i ? 4 : 0} fill={line.color} />
        ))}

        {labels.map((label, i) => (
          <rect
            key={label}
            x={PAD_X + slotWidth * i}
            y={0}
            width={slotWidth}
            height={height}
            fill="transparent"
            onPointerEnter={() => setHoverIndex(i)}
            onPointerLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="position-absolute bg-dark text-white rounded-2 px-2 py-1 small"
          style={{
            left: `${(hovered.bar.centerX / WIDTH) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <div className="fw-bold">{hovered.bar.label}</div>
          <div>
            {bars.name}: {hovered.bar.value}
          </div>
          <div>
            {line.name}: {hovered.line.value}
          </div>
        </div>
      )}
    </div>
  );
}
