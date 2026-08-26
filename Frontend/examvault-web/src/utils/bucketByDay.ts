// Buckets a list of real UTC timestamps into a day-by-day trend series
// covering the last `days` days (inclusive of today). Used by Reports
// pages to turn raw createdAtUtc/timestampUtc arrays into a real trend
// chart instead of a fabricated one.
export function bucketByDay(timestampsUtc: string[], days = 14): { label: string; value: number }[] {
  const buckets: { label: string; value: number; dateKey: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.push({
      label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: 0,
      dateKey: date.toISOString().slice(0, 10),
    });
  }

  const byDateKey = new Map(buckets.map((b) => [b.dateKey, b]));
  for (const ts of timestampsUtc) {
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    const bucket = byDateKey.get(dateKey);
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}
