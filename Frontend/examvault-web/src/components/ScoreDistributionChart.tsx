import { useState } from 'react';

export interface DistributionBucket {
  label: string;
  count: number;
}

interface ScoreDistributionChartProps {
  data: DistributionBucket[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD_TOP = 24;
const PAD_BOTTOM = 28;
const PAD_X = 12;
const BAR_COLOR = '#4f46e5';
const GAP_RATIO = 0.35;

export default function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <div className="text-center text-muted py-5 small">Not enough data yet.</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => d.count));
  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slotWidth = plotWidth / data.length;
  const barWidth = slotWidth * (1 - GAP_RATIO);

  const bars = data.map((d, i) => {
    const barHeight = (d.count / maxValue) * plotHeight;
    return {
      ...d,
      x: PAD_X + slotWidth * i + (slotWidth - barWidth) / 2,
      y: PAD_TOP + plotHeight - barHeight,
      width: barWidth,
      height: barHeight,
      centerX: PAD_X + slotWidth * i + slotWidth / 2,
    };
  });

  const hovered = hoverIndex !== null ? bars[hoverIndex] : null;

  return (
    <div className="position-relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-100" style={{ display: 'block' }}>
        <line
          x1={PAD_X}
          y1={PAD_TOP + plotHeight}
          x2={WIDTH - PAD_X}
          y2={PAD_TOP + plotHeight}
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {bars.map((bar, i) => (
          <g key={bar.label}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
              fill={BAR_COLOR}
              fillOpacity={hoverIndex === null || hoverIndex === i ? 1 : 0.5}
            />
            {bar.count > 0 && (
              <text
                x={bar.centerX}
                y={bar.y - 8}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="#374151"
              >
                {bar.count}
              </text>
            )}
            <text
              x={bar.centerX}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#9ca3af"
            >
              {bar.label}
            </text>
            <rect
              x={PAD_X + slotWidth * i}
              y={0}
              width={slotWidth}
              height={HEIGHT}
              fill="transparent"
              onPointerEnter={() => setHoverIndex(i)}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </g>
        ))}
      </svg>

      {hovered && (
        <div
          className="position-absolute bg-dark text-white rounded-2 px-2 py-1 small"
          style={{
            left: `${(hovered.centerX / WIDTH) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <strong>{hovered.count}</strong> student{hovered.count === 1 ? '' : 's'} · {hovered.label}
        </div>
      )}
    </div>
  );
}
