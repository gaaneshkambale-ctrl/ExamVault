// Shared date-range helpers for the Reports pages: default last-30-days
// window, the "vs prior period" comparison window used by every KPI delta,
// and day-bucketing for the trend line charts. All dates are plain
// yyyy-mm-dd strings (native <input type="date"> value shape) compared
// against UTC ISO timestamps from the API.

export interface DateRange {
  from: string;
  to: string;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Fixed calendar-month windows (not adjustable) - used by Exam/Student
// Results' "vs last month" KPI deltas, distinct from the Reports pages'
// adjustable-range prior-period pattern above.
export function getCalendarMonthWindows(): { current: DateRange; previous: DateRange } {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentEnd = now;
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    current: { from: toDateOnly(currentStart), to: toDateOnly(currentEnd) },
    previous: { from: toDateOnly(previousStart), to: toDateOnly(previousEnd) },
  };
}

export function getDefaultRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

// Immediately-preceding window of the same length, e.g. range = May 1-31
// -> prior = Apr 1-30. Used so every "vs prior period" delta is a real
// comparison against actual prior data, not a decorative number.
export function getPriorPeriod({ from, to }: DateRange): DateRange {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const lengthMs = toDate.getTime() - fromDate.getTime();
  const priorTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const priorFrom = new Date(priorTo.getTime() - lengthMs);
  return { from: toDateOnly(priorFrom), to: toDateOnly(priorTo) };
}

export function isWithinRange(isoUtc: string | null | undefined, range: DateRange): boolean {
  if (!isoUtc) return false;
  const t = new Date(isoUtc).getTime();
  const from = new Date(`${range.from}T00:00:00Z`).getTime();
  const to = new Date(`${range.to}T23:59:59.999Z`).getTime();
  return t >= from && t <= to;
}

export interface DeltaResult {
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function computeDelta(current: number, prior: number): DeltaResult {
  if (prior === 0) {
    return current === 0 ? { percent: 0, direction: 'flat' } : { percent: null, direction: 'up' };
  }
  const percent = ((current - prior) / prior) * 100;
  return {
    percent: Math.round(percent * 10) / 10,
    direction: percent > 0.05 ? 'up' : percent < -0.05 ? 'down' : 'flat',
  };
}

export interface DayBucket {
  date: string;
  label: string;
  count: number;
}

// One bucket per calendar day across the range (inclusive), zero-filled so
// the trend line stays continuous even on days with no activity.
export function bucketByDay(
  dates: (string | null | undefined)[],
  range: DateRange,
): DayBucket[] {
  const from = new Date(`${range.from}T00:00:00Z`);
  const to = new Date(`${range.to}T00:00:00Z`);
  const buckets = new Map<string, DayBucket>();
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = toDateOnly(d);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
    });
  }
  for (const iso of dates) {
    if (!iso) continue;
    const key = iso.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
  }
  return Array.from(buckets.values());
}
