// Shared between admin/AuditReports.tsx and platform/AuditReports.tsx so an
// Activity pill looks the same on both sides. Keyword-matched against the
// verb in the activity string (e.g. "Deleted exam", "Failed login") rather
// than an exact-string lookup table - new activity strings added later
// (new controllers, new modules) get a sensible color for free instead of
// silently falling through to a bare default every time one is added.
export function auditActivityBadgeVariant(activity: string): string {
  const lower = activity.toLowerCase();
  if (lower.includes('failed') || lower.includes('deleted') || lower.includes('deactivated') || lower.includes('rejected')) {
    return 'danger';
  }
  if (lower.includes('locked')) return 'warning';
  if (lower.includes('created') || lower.includes('published') || lower.includes('reactivated') || lower.includes('approved')) {
    return 'success';
  }
  if (lower.includes('updated') || lower.includes('changed') || lower.includes('reset')) {
    return 'primary';
  }
  if (lower.includes('login') || lower.includes('logout')) return 'info';
  return 'secondary';
}
