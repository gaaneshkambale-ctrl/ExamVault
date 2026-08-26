export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface SegmentDonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
}

const SIZE = 160;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_COLOR = '#e5e7eb';

// Generic N-segment ring, for donuts that aren't a strict pass/fail binary
// (see PassRateDonutChart for that one) - built for Exam Type Distribution
// but not tied to it, any {label,value,color}[] works.
export default function SegmentDonutChart({ segments, centerLabel }: SegmentDonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const center = SIZE / 2;

  if (total === 0) {
    return <div className="text-center text-muted py-4 small">Not enough data yet.</div>;
  }

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const length = (s.value / total) * CIRCUMFERENCE;
      const arc = { ...s, length, offset };
      offset += length;
      return arc;
    });

  return (
    <div className="d-flex justify-content-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={center} cy={center} r={RADIUS} fill="none" stroke={TRACK_COLOR} strokeWidth={STROKE} />
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <text x={center} y={center - 4} textAnchor="middle" fontSize={28} fontWeight={700} fill="#1f2937">
          {total}
        </text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize={12} fill="#6b7280">
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}
