// Shared score-percentage bucket scheme for Student Reports and Performance
// Reports (matches report.png's 4-bucket layout). Deliberately different
// from ExamReportDetails.tsx's existing 5-bucket 0-20/20-40/... scheme -
// that page is untouched; this is the new mockup's own buckets.
export const SCORE_BUCKETS = [
  { label: '90% - 100%', min: 90, max: 101, color: '#4f46e5' },
  { label: '75% - 89%', min: 75, max: 90, color: '#f59e0b' },
  { label: '50% - 74%', min: 50, max: 75, color: '#22c55e' },
  { label: 'Below 50%', min: 0, max: 50, color: '#94a3b8' },
];
