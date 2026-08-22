export interface DualTrendPoint {
  label: string;
  valueA: number;
  valueB: number;
}

interface DualTrendChartProps {
  data: DualTrendPoint[];
  seriesALabel: string;
  seriesBLabel: string;
  colorA?: string;
  colorB?: string;
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_X = 12;

// Same hand-rolled SVG approach as ExamsTrendChart (no chart library in this
// codebase) but for two series sharing one scale - Exam Activity needs
// Exams Conducted vs Users Participated on the same axes, which
// ExamsTrendChart's single-series shape can't express without a breaking
// change to its two existing call sites.
export default function DualTrendChart({
  data,
  seriesALabel,
  seriesBLabel,
  colorA = '#4f46e5',
  colorB = '#16a34a',
}: DualTrendChartProps) {
  if (data.length === 0) {
    return <div className="text-center text-muted py-5 small">Not enough data yet.</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => Math.max(d.valueA, d.valueB)));
  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const toPoints = (key: 'valueA' | 'valueB') =>
    data.map((d, i) => ({
      x: PAD_X + stepX * i,
      y: PAD_TOP + plotHeight - (d[key] / maxValue) * plotHeight,
      value: d[key],
      label: d.label,
    }));

  const pointsA = toPoints('valueA');
  const pointsB = toPoints('valueB');
  const pathFor = (points: typeof pointsA) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div>
      <div className="d-flex gap-3 mb-2 small">
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block" style={{ width: 10, height: 10, background: colorA, borderRadius: 2 }} />
          {seriesALabel}
        </span>
        <span className="d-flex align-items-center gap-1">
          <span className="d-inline-block" style={{ width: 10, height: 10, background: colorB, borderRadius: 2 }} />
          {seriesBLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-100" style={{ display: 'block' }}>
        <line x1={PAD_X} y1={PAD_TOP + plotHeight} x2={WIDTH - PAD_X} y2={PAD_TOP + plotHeight} stroke="#e5e7eb" strokeWidth={1} />

        <path d={pathFor(pointsA)} fill="none" stroke={colorA} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathFor(pointsB)} fill="none" stroke={colorB} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {pointsA.map((p) => (
          <circle key={`a-${p.label}`} cx={p.x} cy={p.y} r={3} fill={colorA} stroke="#fff" strokeWidth={1.5} />
        ))}
        {pointsB.map((p) => (
          <circle key={`b-${p.label}`} cx={p.x} cy={p.y} r={3} fill={colorB} stroke="#fff" strokeWidth={1.5} />
        ))}

        {data.map((d, i) => (
          <text key={d.label} x={PAD_X + stepX * i} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#9ca3af">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
