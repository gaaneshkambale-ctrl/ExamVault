import { useState } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

interface ExamsTrendChartProps {
  data: TrendPoint[];
}

const WIDTH = 600;
const HEIGHT = 200;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_X = 12;
const LINE_COLOR = '#4f46e5';

export default function ExamsTrendChart({ data }: ExamsTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="text-center text-muted py-5 small">Not enough data yet.</div>
    );
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PAD_X + stepX * i,
    y: PAD_TOP + plotHeight - (d.value / maxValue) * plotHeight,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD_TOP + plotHeight} L${points[0].x},${PAD_TOP + plotHeight} Z`;

  const handleMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const last = points[points.length - 1];

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

        <path d={areaPath} fill={LINE_COLOR} fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={last.x} cy={last.y} r={4} fill={LINE_COLOR} stroke="#fff" strokeWidth={2} />
        <text x={last.x} y={last.y - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="#374151">
          {last.value}
        </text>

        {points.map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#9ca3af"
          >
            {p.label}
          </text>
        ))}

        {hovered && (
          <line
            x1={hovered.x}
            y1={PAD_TOP}
            x2={hovered.x}
            y2={PAD_TOP + plotHeight}
            stroke="#9ca3af"
            strokeWidth={1}
          />
        )}
        {hovered && (
          <circle cx={hovered.x} cy={hovered.y} r={4} fill={LINE_COLOR} stroke="#fff" strokeWidth={2} />
        )}

        <rect
          x={PAD_X}
          y={0}
          width={plotWidth}
          height={HEIGHT}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="position-absolute bg-dark text-white rounded-2 px-2 py-1 small"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <strong>{hovered.value}</strong> exam{hovered.value === 1 ? '' : 's'} · {hovered.label}
        </div>
      )}
    </div>
  );
}
