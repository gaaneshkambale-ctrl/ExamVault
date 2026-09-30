import { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { formatRemaining } from '../utils/formatRemaining';

interface ResumeSessionCardProps {
  examTitle: string;
  to: string;
  startedAtUtc: string;
  durationMinutes: number;
  expiresAtUtc?: string | null;
  lastActivityAtUtc?: string | null;
}

// Shown instead of silently dropping the student back into the exam: an
// existing InProgress attempt is never replaced by a new one - they continue it.
export default function ResumeSessionCard({
  examTitle,
  to,
  startedAtUtc,
  durationMinutes,
  expiresAtUtc,
  lastActivityAtUtc,
}: ResumeSessionCardProps) {
  const deadline = expiresAtUtc
    ? new Date(expiresAtUtc).getTime()
    : new Date(startedAtUtc).getTime() + durationMinutes * 60_000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
  const timeUp = remaining <= 0;

  return (
    <Card className="border-warning mb-3" role="region" aria-label="Existing exam session">
      <Card.Body>
        <div className="fw-bold mb-2">Existing exam session found</div>
        <div className="small mb-1">
          <span className="text-muted">Exam: </span>
          {examTitle}
        </div>
        <div className="small mb-1">
          <span className="text-muted">Time remaining: </span>
          <span className={`fw-semibold ${timeUp ? 'text-danger' : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {timeUp ? 'Time is up' : formatRemaining(remaining)}
          </span>
        </div>
        {lastActivityAtUtc && (
          <div className="small mb-3">
            <span className="text-muted">Last activity: </span>
            {new Date(lastActivityAtUtc).toLocaleString()}
          </div>
        )}
        <Link to={to} className="btn btn-warning w-100">
          {timeUp ? 'Open Exam to Submit' : 'Continue Exam'}
        </Link>
      </Card.Body>
    </Card>
  );
}
