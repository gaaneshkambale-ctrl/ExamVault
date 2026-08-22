// {{examTitle}}/{{startDate}}/{{duration}} are batch-constant (same for
// every recipient) and get substituted client-side from the selected exam
// right before submit (see substituteExamFields). {{studentName}}/
// {{studentEmail}} genuinely vary per recipient within one batch, so those
// stay untouched here and get substituted server-side, per recipient, in
// NotificationPersistenceService. Template content itself now comes from
// the real backend (see hooks/useNotifications useNotificationTemplates) -
// this file keeps only the pure merge-field substitution utilities.
export const EXAM_FIELD_PLACEHOLDERS = ['{{examTitle}}', '{{startDate}}', '{{duration}}'];

export function containsExamFieldPlaceholder(text: string): boolean {
  return EXAM_FIELD_PLACEHOLDERS.some((p) => text.includes(p));
}

// Substitutes the batch-constant exam fields using the given exam. Leaves
// {{studentName}}/{{studentEmail}} untouched - those are filled server-side
// per recipient.
export function substituteExamFields(
  text: string,
  exam: { title: string; startAtUtc: string | null; durationMinutes: number } | null,
): string {
  if (!exam) return text;
  const startDate = exam.startAtUtc ? new Date(exam.startAtUtc).toLocaleString() : 'Not scheduled';
  return text
    .replaceAll('{{examTitle}}', exam.title)
    .replaceAll('{{startDate}}', startDate)
    .replaceAll('{{duration}}', `${exam.durationMinutes} min`);
}
