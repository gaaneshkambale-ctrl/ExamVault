interface PassRateDonutChartProps {
  passed: number;
  failed: number;
}

const SIZE = 160;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PASS_COLOR = '#198754';
const FAIL_COLOR = '#dc3545';
const TRACK_COLOR = '#e5e7eb';

export default function PassRateDonutChart({ passed, failed }: PassRateDonutChartProps) {
  const total = passed + failed;

  if (total === 0) {
    return <div className="text-center text-muted py-4 small">Not enough data yet.</div>;
  }

  const passRatio = passed / total;
  const passLength = CIRCUMFERENCE * passRatio;
  const center = SIZE / 2;

  return (
    <div className="d-flex justify-content-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={STROKE}
        />
        {passRatio < 1 && (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={FAIL_COLOR}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={0}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
        {passRatio > 0 && (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={PASS_COLOR}
            strokeWidth={STROKE}
            strokeLinecap={passRatio < 1 ? 'butt' : 'round'}
            strokeDasharray={`${passLength} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          fontSize={28}
          fontWeight={700}
          fill="#1f2937"
        >
          {Math.round(passRatio * 100)}%
        </text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize={12} fill="#6b7280">
          Pass Rate
        </text>
      </svg>
    </div>
  );
}
